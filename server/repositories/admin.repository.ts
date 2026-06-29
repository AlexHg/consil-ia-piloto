/**
 * Repositorio de administración.
 *
 * Operaciones destructivas a nivel de toda la base. No traduce a dominio: solo
 * ejecuta SQL crudo sobre PostgreSQL (Kysely). Se mantiene aparte de los
 * repositorios por entidad porque cruza todas las tablas a la vez.
 */

import { sql } from 'kysely'
import { useDb } from '../db/client'

/**
 * Vacía por completo los pools de conocimiento y sus conciliaciones.
 *
 * Un único `TRUNCATE ... RESTART IDENTITY CASCADE` borra las 7 tablas del
 * esquema en una sola sentencia atómica: `CASCADE` respeta las FKs y
 * `RESTART IDENTITY` reinicia las secuencias. No se puede deshacer.
 */
export async function truncateAllPools(): Promise<void> {
  await sql`
    TRUNCATE TABLE
      reconciliation_reviews,
      reconciliation_payments,
      reconciliations,
      reconciliation_runs,
      notes,
      payments,
      invoices
    RESTART IDENTITY CASCADE
  `.execute(useDb())
}
