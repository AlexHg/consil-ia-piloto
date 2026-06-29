/**
 * Construcción de embeddings para las entidades del dominio.
 *
 * Cada entidad se serializa a un texto canónico estable (mismas claves, mismo
 * orden) antes de enviarse al proveedor de IA. La columna `embedding` de la BD
 * almacena el vector como literal de `pgvector`: `'[0.1,0.2,...]'`.
 */

import type { Invoice, OperationalNote, Payment } from '~~/shared/types/domain'

/** Texto canónico de una factura para generar su embedding. */
export function buildInvoiceText(invoice: Invoice): string {
  return [
    `Invoice ${invoice.id}`,
    `Vendor: ${invoice.vendor}`,
    invoice.poNumber ? `Purchase order: ${invoice.poNumber}` : '',
    `Amount: ${invoice.amount} ${invoice.currency}`,
    `Issued: ${invoice.invoiceDate}`,
    `Due: ${invoice.dueDate}`,
    `Status: ${invoice.status}`
  ].filter(Boolean).join('. ')
}

/** Texto canónico de un pago para generar su embedding. */
export function buildPaymentText(payment: Payment): string {
  return [
    `Payment ${payment.id}`,
    `Payer: ${payment.payerName}`,
    payment.reference ? `Reference: ${payment.reference}` : '',
    `Amount: ${payment.amount} ${payment.currency}`,
    `Date: ${payment.paymentDate}`
  ].filter(Boolean).join('. ')
}

/** Texto canónico de una nota operativa para generar su embedding. */
export function buildNoteText(note: OperationalNote): string {
  return [`Note (${note.source})`, note.text].filter(Boolean).join(': ')
}

/**
 * Serializa un vector numérico al literal aceptado por `pgvector`.
 * Se inserta luego como `sql\`${literal}::vector\``.
 */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`
}
