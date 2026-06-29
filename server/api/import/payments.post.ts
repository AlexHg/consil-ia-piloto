import { importPayments, type ImportBody } from '../../services/ingestion'
import { enqueueEnrichment } from '../../services/ai/queue'

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)

  const result = await importPayments(body ?? {})

  if (result.created === 0) {
    throw createError({ statusCode: 422, statusMessage: 'No valid payments were found in the file.' })
  }

  await enqueueEnrichment('import', { debounce: true })

  setResponseStatus(event, 201)
  return result
})
