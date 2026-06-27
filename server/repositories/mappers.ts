/**
 * Mapeo entre filas de base de datos (Kysely) y entidades del dominio.
 *
 * Los repositorios son la única capa que conoce la forma de las filas. Hacia el
 * resto del sistema (services, motor, UI) solo exponen entidades de
 * `shared/types/domain.ts`. Esto mantiene el dominio independiente de la
 * persistencia.
 *
 * Nota: las columnas `numeric` viajan como `string` en el driver `pg`; aquí se
 * convierten a `number` (dominio) y de vuelta a `string` (al persistir).
 */

import type { Insertable, Selectable } from 'kysely'
import type {
  Invoice,
  OperationalNote,
  Payment,
  ReconciliationResult,
  ReconciliationStatus
} from '~~/shared/types/domain'
import type {
  InvoicesTable,
  NotesTable,
  PaymentsTable,
  ReconciliationsTable
} from '../db/types'

export function toNumber(value: string | number | null): number {
  if (value == null) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toMoney(value: number): string {
  return value.toFixed(2)
}

// --- Invoice ----------------------------------------------------------------
export function invoiceFromRow(row: Selectable<InvoicesTable>): Invoice {
  return {
    id: row.id,
    vendor: row.vendor,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    currency: row.currency,
    amount: toNumber(row.amount),
    poNumber: row.po_number,
    status: row.status
  }
}

export function invoiceToRow(invoice: Invoice, source = 'manual'): Insertable<InvoicesTable> {
  return {
    id: invoice.id,
    vendor: invoice.vendor,
    vendor_normalized: invoice.vendor.toLowerCase().trim(),
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate,
    currency: invoice.currency,
    amount: toMoney(invoice.amount),
    po_number: invoice.poNumber,
    status: invoice.status,
    source
  }
}

// --- Payment ----------------------------------------------------------------
export function paymentFromRow(row: Selectable<PaymentsTable>): Payment {
  return {
    id: row.id,
    paymentDate: row.payment_date,
    payerName: row.payer_name,
    currency: row.currency,
    amount: toNumber(row.amount),
    reference: row.reference
  }
}

export function paymentToRow(payment: Payment, source = 'manual'): Insertable<PaymentsTable> {
  return {
    id: payment.id,
    payment_date: payment.paymentDate,
    payer_name: payment.payerName,
    payer_name_normalized: payment.payerName.toLowerCase().trim(),
    currency: payment.currency,
    amount: toMoney(payment.amount),
    reference: payment.reference,
    source
  }
}

// --- Note -------------------------------------------------------------------
export function noteFromRow(row: Selectable<NotesTable>): OperationalNote {
  return {
    id: row.id,
    source: row.source,
    text: row.text,
    interpretedSummary: row.interpreted_summary,
    referencedIds: row.referenced_ids
  }
}

export function noteToRow(note: OperationalNote): Insertable<NotesTable> {
  return {
    source: note.source,
    text: note.text
  }
}

// --- Reconciliation ---------------------------------------------------------
export function reconciliationFromRow(
  row: Selectable<ReconciliationsTable>,
  matchedPaymentIds: string[]
): ReconciliationResult {
  return {
    invoiceId: row.invoice_id,
    matchedPaymentIds,
    status: row.status as ReconciliationStatus,
    confidence: toNumber(row.confidence),
    remainingBalance: row.remaining_balance == null ? null : toNumber(row.remaining_balance),
    suggestedAction: row.suggested_action,
    explanation: row.explanation,
    signals: row.signals
  }
}
