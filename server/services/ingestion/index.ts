import { parseCsv } from '../../utils/csv'
import {
  clean,
  nextId,
  normalizeInvoiceRow,
  normalizeNoteRow,
  normalizePaymentRow,
  toNumber
} from './normalize'
import {
  bulkInsertInvoices,
  deleteInvoice,
  insertInvoice,
  listInvoices
} from '../../repositories/invoices.repository'
import {
  bulkInsertPayments,
  deletePayment,
  insertPayment,
  listPayments
} from '../../repositories/payments.repository'
import {
  bulkInsertNotes,
  deleteNote,
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

/**
 * Contenido a importar. Una fuente puede llegar como CSV o como JSON; el resto
 * del sistema solo verá entidades de dominio ya normalizadas.
 */
export interface ImportBody {
  csv?: string
  json?: string
}

type ImportFormat = 'csv' | 'json'

/**
 * Convierte el cuerpo de importación (CSV o JSON) en filas genéricas listas
 * para normalizar. Soporta JSON como array de objetos o como un único objeto.
 */
function readRows(body: ImportBody): { rows: Record<string, unknown>[], format: ImportFormat } {
  if (body?.json && body.json.trim()) {
    return { rows: parseJsonRows(body.json), format: 'json' }
  }
  if (body?.csv && body.csv.trim()) {
    return { rows: parseCsv(body.csv), format: 'csv' }
  }
  throw createError({ statusCode: 422, statusMessage: 'Import content is empty.' })
}

function parseJsonRows(json: string): Record<string, unknown>[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw createError({ statusCode: 422, statusMessage: 'JSON content is not valid.' })
  }
  const list = Array.isArray(data) ? data : [data]
  return list.filter(
    (row): row is Record<string, unknown> =>
      typeof row === 'object' && row !== null && !Array.isArray(row)
  )
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

// --- Bajas -------------------------------------------------------------------

/**
 * Elimina una entidad de su pool. Las conciliaciones asociadas se limpian en
 * cascada a nivel de base de datos (FK `ON DELETE CASCADE`); el motor seguirá
 * siendo coherente en la próxima corrida. Devuelve `false` si no existía.
 */
export function removeInvoice(id: string): Promise<boolean> {
  return deleteInvoice(id)
}

export function removePayment(id: string): Promise<boolean> {
  return deletePayment(id)
}

export function removeNote(id: string): Promise<boolean> {
  return deleteNote(id)
}

// --- Importación por archivo (CSV o JSON) -----------------------------------

export async function importInvoices(body: ImportBody): Promise<ImportResult<Invoice>> {
  const { rows, format } = readRows(body)
  const items = rows.map(normalizeInvoiceRow).filter(invoice => invoice.id || invoice.vendor)
  const created = await bulkInsertInvoices(items, format)
  return { created: created.length, items: created }
}

export async function importPayments(body: ImportBody): Promise<ImportResult<Payment>> {
  const { rows, format } = readRows(body)
  const items = rows.map(normalizePaymentRow).filter(payment => payment.id || payment.payerName)
  const created = await bulkInsertPayments(items, format)
  return { created: created.length, items: created }
}

export async function importNotes(body: ImportBody): Promise<ImportResult<OperationalNote>> {
  const { rows } = readRows(body)
  const items = rows.map(normalizeNoteRow).filter(note => note.text)
  const created = await bulkInsertNotes(items)
  return { created: created.length, items: created }
}
