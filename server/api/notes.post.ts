import { createNote } from '../services/ingestion'
import { enqueueEnrichment } from '../services/ai/queue'
import type { OperationalNote } from '~~/shared/types/domain'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<OperationalNote>>(event)

  if (!body?.text || typeof body.text !== 'string' || !body.text.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El texto de la nota es obligatorio.' })
  }

  const note = await createNote(body)
  await enqueueEnrichment('manual', { debounce: true })

  setResponseStatus(event, 201)
  return note
})
