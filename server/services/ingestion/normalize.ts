/**
 * Normalización de fuentes a entidades de dominio.
 *
 * Toda fuente (CSV, JSON, alta manual) pasa por aquí antes de persistir. El
 * resto del sistema solo ve entidades de `shared/types/domain.ts`.
 */

import type { Invoice, OperationalNote, Payment } from '~~/shared/types/domain'

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function clean(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

/**
 * Devuelve el primer valor presente entre varias claves alternativas.
 *
 * Permite que un mismo normalizador acepte tanto las cabeceras snake_case del
 * CSV (`invoice_date`) como las claves camelCase del JSON de dominio
 * (`invoiceDate`), sin que el resto del sistema sepa de qué formato vino.
 */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

/**
 * Genera el siguiente ID secuencial (`INV-9`, `PAY-11`) a partir de los IDs
 * existentes. Usado solo en altas manuales sin ID explícito.
 */
export function nextId(prefix: string, existingIds: string[]): string {
  const max = existingIds.reduce((acc, id) => {
    const match = /(\d+)\s*$/.exec(id)
    const value = match ? Number.parseInt(match[1]!, 10) : 0
    return Number.isFinite(value) ? Math.max(acc, value) : acc
  }, 0)
  return `${prefix}-${max + 1}`
}

/**
 * Normaliza una fila/objeto a `Invoice`. Acepta tanto las cabeceras del CSV
 * (`invoice_id`, `invoice_date`, `po_number`) como las claves del JSON de
 * dominio (`id`, `invoiceDate`, `poNumber`).
 */
export function normalizeInvoiceRow(row: Record<string, unknown>): Invoice {
  const poNumber = clean(pick(row, 'po_number', 'poNumber'))
  return {
    id: clean(pick(row, 'invoice_id', 'invoiceId', 'id')),
    vendor: clean(pick(row, 'vendor')),
    invoiceDate: clean(pick(row, 'invoice_date', 'invoiceDate')),
    dueDate: clean(pick(row, 'due_date', 'dueDate')),
    currency: clean(pick(row, 'currency')) || 'USD',
    amount: toNumber(pick(row, 'amount')),
    poNumber: poNumber || null,
    status: clean(pick(row, 'status')) || 'open'
  }
}

/**
 * Normaliza una fila/objeto a `Payment`. Acepta cabeceras CSV
 * (`payment_id`, `payment_date`, `payer_name`) y claves JSON
 * (`id`, `paymentDate`, `payerName`).
 */
export function normalizePaymentRow(row: Record<string, unknown>): Payment {
  const reference = clean(pick(row, 'reference'))
  return {
    id: clean(pick(row, 'payment_id', 'paymentId', 'id')),
    paymentDate: clean(pick(row, 'payment_date', 'paymentDate')),
    payerName: clean(pick(row, 'payer_name', 'payerName')),
    currency: clean(pick(row, 'currency')) || 'USD',
    amount: toNumber(pick(row, 'amount')),
    reference: reference || null
  }
}

/**
 * Normaliza una fila/objeto a `OperationalNote`. Fuente principal según la
 * especificación: JSON; también soporta CSV con columnas `source`/`text`.
 */
export function normalizeNoteRow(row: Record<string, unknown>): OperationalNote {
  return {
    source: clean(pick(row, 'source')) || 'unknown',
    text: clean(pick(row, 'text'))
  }
}
