/**
 * Runner de migraciones (Kysely).
 *
 * Uso:
 *   pnpm db:migrate           -> aplica todas las migraciones pendientes (up)
 *   pnpm db:migrate:down      -> revierte la última migración (down)
 *
 * Lee `DATABASE_URL` de `.env` (este script corre fuera de Nitro, por lo que
 * carga el .env de forma mínima por sí mismo).
 */

import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Kysely, PostgresDialect } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import pg from 'pg'
import { loadEnv } from './env'
import type { Database } from './types'

async function run(): Promise<void> {
  loadEnv()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida. Revisa tu archivo .env.')
  }

  const direction = process.argv[2] === 'down' ? 'down' : 'up'
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) })
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: fsp,
      path,
      migrationFolder: path.join(__dirname, 'migrations')
    })
  })

  const { error, results } = direction === 'down'
    ? await migrator.migrateDown()
    : await migrator.migrateToLatest()

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(`✓ Migración "${result.migrationName}" (${result.direction}) aplicada`)
    } else if (result.status === 'Error') {
      console.error(`✗ Error al aplicar "${result.migrationName}"`)
    }
  }

  if (error) {
    console.error('Falló la migración:', error)
    await db.destroy()
    process.exit(1)
  }

  if (!results?.length) {
    console.log('No hay migraciones pendientes.')
  }

  await db.destroy()
}

run()
