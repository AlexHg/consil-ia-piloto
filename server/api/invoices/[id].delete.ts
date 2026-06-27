import { removeInvoice } from '../../services/ingestion'

/**
 * Elimina una factura del pool. Las conciliaciones que la referencian se
 * limpian en cascada (FK `ON DELETE CASCADE`). Endpoint delgado: valida y
 * delega en la capa de ingesta.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de la factura.' })
  }

  const deleted = await removeInvoice(id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: `No se encontró la factura ${id}.` })
  }

  return { id, deleted: true }
})
