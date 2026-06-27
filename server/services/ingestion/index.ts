import { parseCsv } from '../../utils/csv'
import { getStore, normalizeInvoiceRow, normalizePaymentRow } from './store'
import type { Invoice, Payment, OperationalNote } from '~~/shared/types/domain'

/**
 * Capa de ingesta.
 *
 * Cada fuente (CSV / JSON / OCR / alta manual) entra aquí y se normaliza a las
 * entidades del dominio. El resto del sistema (motor de conciliación, UI) nunca
 * conoce el origen ni el formato crudo de la información.
 *
 * La persistencia vive en `store.ts` (hoy en memoria, mañana PostgreSQL +
 * pgvector). Las lecturas y escrituras pasan siempre por aquí.
 */

export interface ImportResult<T> {
  created: number
  items: T[]
}

// --- Lecturas ---------------------------------------------------------------

export async function loadInvoices(): Promise<Invoice[]> {
  return (await getStore()).invoices
}

export async function loadPayments(): Promise<Payment[]> {
  return (await getStore()).payments
}

export async function loadNotes(): Promise<OperationalNote[]> {
  return (await getStore()).notes
}

// --- Utilidades de normalización -------------------------------------------

function nextId(prefix: string, existing: { id: string }[]): string {
  const max = existing.reduce((acc, item) => {
    const match = /(\d+)\s*$/.exec(item.id)
    const value = match ? Number.parseInt(match[1]!, 10) : 0
    return Number.isFinite(value) ? Math.max(acc, value) : acc
  }, 0)
  return `${prefix}-${max + 1}`
}

function toAmount(value: number | string | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// --- Altas individuales (formulario) ----------------------------------------

export async function createInvoice(input: Partial<Invoice>): Promise<Invoice> {
  const store = await getStore()
  const invoice: Invoice = {
    id: clean(input.id) || nextId('INV', store.invoices),
    vendor: clean(input.vendor),
    invoiceDate: clean(input.invoiceDate),
    dueDate: clean(input.dueDate),
    currency: clean(input.currency) || 'USD',
    amount: toAmount(input.amount),
    poNumber: clean(input.poNumber) || null,
    status: clean(input.status) || 'open'
  }
  store.invoices.push(invoice)
  return invoice
}

export async function createPayment(input: Partial<Payment>): Promise<Payment> {
  const store = await getStore()
  const payment: Payment = {
    id: clean(input.id) || nextId('PAY', store.payments),
    paymentDate: clean(input.paymentDate),
    payerName: clean(input.payerName),
    currency: clean(input.currency) || 'USD',
    amount: toAmount(input.amount),
    reference: clean(input.reference) || null
  }
  store.payments.push(payment)
  return payment
}

export async function createNote(input: Partial<OperationalNote>): Promise<OperationalNote> {
  const store = await getStore()
  const note: OperationalNote = {
    source: clean(input.source) || 'unknown',
    text: clean(input.text)
  }
  store.notes.push(note)
  return note
}

// --- Importación CSV --------------------------------------------------------

export async function importInvoicesCsv(csv: string): Promise<ImportResult<Invoice>> {
  const store = await getStore()
  const items = parseCsv(csv).map(normalizeInvoiceRow).filter(invoice => invoice.id || invoice.vendor)
  store.invoices.push(...items)
  return { created: items.length, items }
}

export async function importPaymentsCsv(csv: string): Promise<ImportResult<Payment>> {
  const store = await getStore()
  const items = parseCsv(csv).map(normalizePaymentRow).filter(payment => payment.id || payment.payerName)
  store.payments.push(...items)
  return { created: items.length, items }
}

export async function importNotesCsv(csv: string): Promise<ImportResult<OperationalNote>> {
  const store = await getStore()
  const items = parseCsv(csv)
    .map(row => ({ source: clean(row.source) || 'unknown', text: clean(row.text) }))
    .filter(note => note.text)
  store.notes.push(...items)
  return { created: items.length, items }
}
