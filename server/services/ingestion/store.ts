import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCsv } from '../../utils/csv'
import type { Invoice, Payment, OperationalNote } from '~~/shared/types/domain'

/**
 * Store en memoria de los pools de conocimiento.
 *
 * Se siembra una sola vez desde los archivos de muestra (`data/samples`) y a
 * partir de ahí actúa como fuente de verdad en tiempo de ejecución: las altas
 * manuales y las importaciones CSV escriben aquí. Esto desacopla el resto de la
 * arquitectura del origen de los datos; mañana este store se reemplaza por
 * repositorios sobre PostgreSQL + pgvector sin tocar services ni UI.
 *
 * Se cuelga de `globalThis` para sobrevivir al hot-reload de Nitro en desarrollo.
 */

interface PoolStore {
  invoices: Invoice[]
  payments: Payment[]
  notes: OperationalNote[]
}

const SAMPLES_DIR = join(process.cwd(), 'data', 'samples')
const STORE_KEY = Symbol.for('reconciliation.pool.store')

function toNumber(value: string | undefined): number {
  const parsed = Number.parseFloat((value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

async function readSample(file: string): Promise<string> {
  return readFile(join(SAMPLES_DIR, file), 'utf-8')
}

function normalizeInvoiceRow(row: Record<string, string>): Invoice {
  return {
    id: row.invoice_id ?? '',
    vendor: row.vendor ?? '',
    invoiceDate: row.invoice_date ?? '',
    dueDate: row.due_date ?? '',
    currency: row.currency ?? 'USD',
    amount: toNumber(row.amount),
    poNumber: row.po_number ? row.po_number : null,
    status: row.status ?? 'open'
  }
}

function normalizePaymentRow(row: Record<string, string>): Payment {
  return {
    id: row.payment_id ?? '',
    paymentDate: row.payment_date ?? '',
    payerName: row.payer_name ?? '',
    currency: row.currency ?? 'USD',
    amount: toNumber(row.amount),
    reference: row.reference ? row.reference : null
  }
}

async function seed(): Promise<PoolStore> {
  const [invoicesCsv, paymentsCsv, notesJson] = await Promise.all([
    readSample('invoices.csv'),
    readSample('payments.csv'),
    readSample('notes.json')
  ])

  const notes = (JSON.parse(notesJson) as Array<Partial<OperationalNote>>).map(note => ({
    source: note.source ?? 'unknown',
    text: note.text ?? ''
  }))

  return {
    invoices: parseCsv(invoicesCsv).map(normalizeInvoiceRow),
    payments: parseCsv(paymentsCsv).map(normalizePaymentRow),
    notes
  }
}

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: Promise<PoolStore>
}

export function getStore(): Promise<PoolStore> {
  const scope = globalThis as GlobalWithStore
  if (!scope[STORE_KEY]) {
    scope[STORE_KEY] = seed()
  }
  return scope[STORE_KEY]
}

export { normalizeInvoiceRow, normalizePaymentRow }
