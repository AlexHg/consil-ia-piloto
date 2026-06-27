/**
 * Cola de trabajos (pg-boss sobre PostgreSQL).
 *
 * pg-boss usa la misma base de datos que la app (la fuente de verdad) pero vive
 * en su propio esquema (`pgboss` por defecto), aislado de las tablas de dominio.
 * Esto permite desacoplar la ingesta de la conciliación sin añadir Redis/SQS:
 *
 *   Importación → Persistencia → (cola) → Reconciliation Worker → Resultados
 *
 * La instancia se cuelga de `globalThis` para sobrevivir al hot-reload de Nitro
 * en desarrollo y evitar abrir múltiples pools / listeners.
 */

import { PgBoss } from 'pg-boss'

/** Nombres de las colas. Centralizados para evitar strings mágicos dispersos. */
export const QUEUES = {
  reconciliation: 'reconciliation'
} as const

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

const BOSS_KEY = Symbol.for('reconciliation.queue.boss')

type GlobalWithBoss = typeof globalThis & {
  [BOSS_KEY]?: Promise<PgBoss>
}

async function create(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida. Revisa tu archivo .env.')
  }

  const boss = new PgBoss({
    connectionString,
    schema: process.env.PGBOSS_SCHEMA || 'pgboss',
    max: 5,
    // Despierta a los workers en cuanto se encola un job, sin esperar al polling.
    useListenNotify: true
  })

  // pg-boss emite 'error' de forma asíncrona; sin listener tumbaría el proceso.
  boss.on('error', (error: unknown) => {
    console.error('[pg-boss] error', error)
  })

  // `start()` instala/migra el esquema de pg-boss dentro de la base de datos.
  await boss.start()
  return boss
}

/**
 * Devuelve la instancia de pg-boss ya iniciada (singleton). La primera llamada
 * crea el esquema en la base de datos; las siguientes reutilizan la conexión.
 */
export function useBoss(): Promise<PgBoss> {
  const scope = globalThis as GlobalWithBoss
  if (!scope[BOSS_KEY]) {
    // Si el arranque falla (DB aún no disponible), limpiamos la promesa cacheada
    // para permitir reintentar en la siguiente llamada.
    scope[BOSS_KEY] = create().catch((error) => {
      scope[BOSS_KEY] = undefined
      throw error
    })
  }
  return scope[BOSS_KEY]
}

/** Detiene pg-boss de forma ordenada (cierre del servidor). */
export async function stopBoss(): Promise<void> {
  const scope = globalThis as GlobalWithBoss
  if (!scope[BOSS_KEY]) return
  const boss = await scope[BOSS_KEY]
  scope[BOSS_KEY] = undefined
  await boss.stop({ graceful: true })
}
