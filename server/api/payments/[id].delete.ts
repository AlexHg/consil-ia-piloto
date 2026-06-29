import { removePayment } from '../../services/ingestion'

/**
 * Elimina un pago del pool. Los vínculos con conciliaciones
 * (`reconciliation_payments`) se limpian en cascada. Endpoint delgado: valida y
 * delega en la capa de ingesta.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Payment identifier is required.' })
  }

  const deleted = await removePayment(id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: `Payment ${id} was not found.` })
  }

  return { id, deleted: true }
})
