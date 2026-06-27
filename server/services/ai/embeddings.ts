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
    `Factura ${invoice.id}`,
    `Proveedor: ${invoice.vendor}`,
    invoice.poNumber ? `Orden de compra: ${invoice.poNumber}` : '',
    `Monto: ${invoice.amount} ${invoice.currency}`,
    `Emitida: ${invoice.invoiceDate}`,
    `Vence: ${invoice.dueDate}`,
    `Estado: ${invoice.status}`
  ].filter(Boolean).join('. ')
}

/** Texto canónico de un pago para generar su embedding. */
export function buildPaymentText(payment: Payment): string {
  return [
    `Pago ${payment.id}`,
    `Pagador: ${payment.payerName}`,
    payment.reference ? `Referencia: ${payment.reference}` : '',
    `Monto: ${payment.amount} ${payment.currency}`,
    `Fecha: ${payment.paymentDate}`
  ].filter(Boolean).join('. ')
}

/** Texto canónico de una nota operativa para generar su embedding. */
export function buildNoteText(note: OperationalNote): string {
  return [`Nota (${note.source})`, note.text].filter(Boolean).join(': ')
}

/**
 * Serializa un vector numérico al literal aceptado por `pgvector`.
 * Se inserta luego como `sql\`${literal}::vector\``.
 */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`
}
