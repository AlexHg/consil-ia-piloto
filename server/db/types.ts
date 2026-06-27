/**
 * Tipos de base de datos para Kysely.
 *
 * Describe la forma de cada tabla a nivel SQL (la interfaz `Database` es el
 * contrato que tipa todas las consultas). Se mantiene alineado con el modelo
 * conceptual en `.knowledge/docs/Modelo-Conceptual-Base-Datos.md` y con el
 * dominio de `shared/types/domain.ts`.
 *
 * Convenciones:
 * - `Generated<T>`: columna con default/serial; opcional al insertar.
 * - `numeric` viaja como `string` en el driver `pg`; se convierte a `number` en mappers.
 * - `jsonb` se lee como objeto JS y se inserta como `string` (JSON serializado).
 * - `vector(1536)` (pgvector) se modela como `string` serializado: `'[0.1, 0.2, ...]'`.
 */

import type { ColumnType, Generated, JSONColumnType } from 'kysely'
import type { EvidenceSignal } from '~~/shared/types/domain'

/** Fecha gestionada por la base (default `now()`); se inserta/actualiza opcionalmente. */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>

export const EMBEDDING_DIMENSIONS = 1536

export interface InvoicesTable {
  id: string
  vendor: string
  vendor_normalized: string | null
  invoice_date: string
  due_date: string
  currency: string
  amount: string
  po_number: string | null
  status: Generated<string>
  source: Generated<string>
  embedding: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface PaymentsTable {
  id: string
  payment_date: string
  payer_name: string
  payer_name_normalized: string | null
  currency: string
  amount: string
  reference: string | null
  source: Generated<string>
  embedding: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface NotesTable {
  id: Generated<string>
  source: string
  text: string
  interpreted_summary: string | null
  referenced_ids: string[] | null
  embedding: string | null
  created_at: Generated<Timestamp>
}

export interface ReconciliationRunsTable {
  id: Generated<string>
  trigger: Generated<string>
  invoices_count: number | null
  started_at: Generated<Timestamp>
  finished_at: Timestamp | null
}

export interface ReconciliationsTable {
  id: Generated<string>
  invoice_id: string
  status: string
  confidence: string
  remaining_balance: string | null
  suggested_action: string
  explanation: string
  signals: JSONColumnType<EvidenceSignal[], string, string>
  run_id: string | null
  created_at: Generated<Timestamp>
  updated_at: Generated<Timestamp>
}

export interface ReconciliationPaymentsTable {
  reconciliation_id: string
  payment_id: string
  applied_amount: string | null
}

export interface ReconciliationReviewsTable {
  id: Generated<string>
  reconciliation_id: string
  action: string
  actor: string
  previous_status: string | null
  new_status: string | null
  comment: string | null
  created_at: Generated<Timestamp>
}

export interface Database {
  invoices: InvoicesTable
  payments: PaymentsTable
  notes: NotesTable
  reconciliation_runs: ReconciliationRunsTable
  reconciliations: ReconciliationsTable
  reconciliation_payments: ReconciliationPaymentsTable
  reconciliation_reviews: ReconciliationReviewsTable
}
