/**
 * Normalización de fuentes a entidades de dominio.
 *
 * Toda fuente (CSV, JSON, alta manual) pasa por aquí antes de persistir. El
 * resto del sistema solo ve entidades de `shared/types/domain.ts`.
 */

import type { Invoice, Payment } from '~~/shared/types/domain'

export function toNumber(value: number | string | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

export function normalizeInvoiceRow(row: Record<string, string>): Invoice {
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

export function normalizePaymentRow(row: Record<string, string>): Payment {
  return {
    id: row.payment_id ?? '',
    paymentDate: row.payment_date ?? '',
    payerName: row.payer_name ?? '',
    currency: row.currency ?? 'USD',
    amount: toNumber(row.amount),
    reference: row.reference ? row.reference : null
  }
}
