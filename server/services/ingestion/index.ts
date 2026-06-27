import { parseCsv } from '../../utils/csv'
import { clean, nextId, normalizeInvoiceRow, normalizePaymentRow, toNumber } from './normalize'
import {
  bulkInsertInvoices,
  insertInvoice,
  listInvoices
} from '../../repositories/invoices.repository'
import {
  bulkInsertPayments,
  insertPayment,
  listPayments
} from '../../repositories/payments.repository'
import {
  bulkInsertNotes,
  insertNote,
  listNotes
} from '../../repositories/notes.repository'
import type { Invoice, OperationalNote, Payment } from '~~/shared/types/domain'

/**
 * Capa de ingesta.
 *
 * Cada fuente (CSV / JSON / OCR / alta manual) entra aquí y se normaliza a las
 * entidades del dominio. El resto del sistema (motor de conciliación, UI) nunca
 * conoce el origen ni el formato crudo de la información.
 *
 * La persistencia vive en los repositorios (PostgreSQL + pgvector vía Kysely).
 * Las lecturas y escrituras pasan siempre por aquí.
 */

export interface ImportResult<T> {
  created: number
  items: T[]
}

// --- Lecturas ---------------------------------------------------------------

export function loadInvoices(): Promise<Invoice[]> {
  return listInvoices()
}

export function loadPayments(): Promise<Payment[]> {
  return listPayments()
}

export function loadNotes(): Promise<OperationalNote[]> {
  return listNotes()
}

// --- Altas individuales (formulario) ----------------------------------------

export async function createInvoice(input: Partial<Invoice>): Promise<Invoice> {
  const existing = await listInvoices()
  const invoice: Invoice = {
    id: clean(input.id) || nextId('INV', existing.map(i => i.id)),
    vendor: clean(input.vendor),
    invoiceDate: clean(input.invoiceDate),
    dueDate: clean(input.dueDate),
    currency: clean(input.currency) || 'USD',
    amount: toNumber(input.amount),
    poNumber: clean(input.poNumber) || null,
    status: clean(input.status) || 'open'
  }
  return insertInvoice(invoice, 'manual')
}

export async function createPayment(input: Partial<Payment>): Promise<Payment> {
  const existing = await listPayments()
  const payment: Payment = {
    id: clean(input.id) || nextId('PAY', existing.map(p => p.id)),
    paymentDate: clean(input.paymentDate),
    payerName: clean(input.payerName),
    currency: clean(input.currency) || 'USD',
    amount: toNumber(input.amount),
    reference: clean(input.reference) || null
  }
  return insertPayment(payment, 'manual')
}

export async function createNote(input: Partial<OperationalNote>): Promise<OperationalNote> {
  const note: OperationalNote = {
    source: clean(input.source) || 'unknown',
    text: clean(input.text)
  }
  return insertNote(note)
}

// --- Importación CSV --------------------------------------------------------

export async function importInvoicesCsv(csv: string): Promise<ImportResult<Invoice>> {
  const items = parseCsv(csv).map(normalizeInvoiceRow).filter(invoice => invoice.id || invoice.vendor)
  const created = await bulkInsertInvoices(items, 'csv')
  return { created: created.length, items: created }
}

export async function importPaymentsCsv(csv: string): Promise<ImportResult<Payment>> {
  const items = parseCsv(csv).map(normalizePaymentRow).filter(payment => payment.id || payment.payerName)
  const created = await bulkInsertPayments(items, 'csv')
  return { created: created.length, items: created }
}

export async function importNotesCsv(csv: string): Promise<ImportResult<OperationalNote>> {
  const items = parseCsv(csv)
    .map(row => ({ source: clean(row.source) || 'unknown', text: clean(row.text) }))
    .filter(note => note.text)
  const created = await bulkInsertNotes(items)
  return { created: created.length, items: created }
}
