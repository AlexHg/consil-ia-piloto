import { removeNote } from '../../services/ingestion'

/**
 * Elimina una nota operativa del pool. Endpoint delgado: valida y delega en la
 * capa de ingesta.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de la nota.' })
  }

  const deleted = await removeNote(id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: `No se encontró la nota ${id}.` })
  }

  return { id, deleted: true }
})
