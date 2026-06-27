import { removePayment } from '../../services/ingestion'

/**
 * Elimina un pago del pool. Los vínculos con conciliaciones
 * (`reconciliation_payments`) se limpian en cascada. Endpoint delgado: valida y
 * delega en la capa de ingesta.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador del pago.' })
  }

  const deleted = await removePayment(id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: `No se encontró el pago ${id}.` })
  }

  return { id, deleted: true }
})
