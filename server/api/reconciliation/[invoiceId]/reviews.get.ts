import { listReviewsByInvoice } from '../../../repositories/reconciliations.repository'
import type { ReconciliationReviewLogEntry } from '~~/shared/types/domain'

/**
 * Devuelve el audit trail (historial de decisiones humanas) de una factura.
 *
 * Endpoint de solo lectura: expone las entradas append-only de
 * `reconciliation_reviews` para que la UI muestre el rastro auditable.
 */
export default defineEventHandler(async (event): Promise<ReconciliationReviewLogEntry[]> => {
  const invoiceId = getRouterParam(event, 'invoiceId')

  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: 'Invoice identifier is required.' })
  }

  return listReviewsByInvoice(invoiceId)
})
