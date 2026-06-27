import { importNotesCsv } from '../../services/ingestion'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ csv?: string }>(event)

  if (!body?.csv || typeof body.csv !== 'string' || !body.csv.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El contenido CSV está vacío.' })
  }

  const result = await importNotesCsv(body.csv)

  if (result.created === 0) {
    throw createError({ statusCode: 422, statusMessage: 'No se encontraron filas válidas en el CSV.' })
  }

  setResponseStatus(event, 201)
  return result
})
