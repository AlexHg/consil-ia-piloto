/**
 * Cliente de base de datos (Kysely + node-postgres).
 *
 * PostgreSQL es la fuente de verdad. La instancia se cuelga de `globalThis` para
 * sobrevivir al hot-reload de Nitro en desarrollo y evitar abrir múltiples pools.
 */

import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types'

const CLIENT_KEY = Symbol.for('reconciliation.db.client')

type GlobalWithDb = typeof globalThis & {
  [CLIENT_KEY]?: Kysely<Database>
}

function create(): Kysely<Database> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida. Revisa tu archivo .env.')
  }

  const dialect = new PostgresDialect({
    pool: new pg.Pool({ connectionString, max: 10 })
  })

  return new Kysely<Database>({ dialect })
}

export function useDb(): Kysely<Database> {
  const scope = globalThis as GlobalWithDb
  if (!scope[CLIENT_KEY]) {
    scope[CLIENT_KEY] = create()
  }
  return scope[CLIENT_KEY]
}
