import { createNote } from '../services/ingestion'
import type { OperationalNote } from '~~/shared/types/domain'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<OperationalNote>>(event)

  if (!body?.text || typeof body.text !== 'string' || !body.text.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El texto de la nota es obligatorio.' })
  }

  setResponseStatus(event, 201)
  return createNote(body)
})
