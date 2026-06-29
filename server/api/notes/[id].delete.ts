import { removeNote } from '../../services/ingestion'

/**
 * Elimina una nota operativa del pool. Endpoint delgado: valida y delega en la
 * capa de ingesta.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Note identifier is required.' })
  }

  const deleted = await removeNote(id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: `Note ${id} was not found.` })
  }

  return { id, deleted: true }
})
