import { importInvoices, type ImportBody } from '../../services/ingestion'
import { enqueueReconciliation } from '../../services/reconciliation/queue'

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)

  const result = await importInvoices(body ?? {})

  if (result.created === 0) {
    throw createError({ statusCode: 422, statusMessage: 'No se encontraron facturas válidas en el archivo.' })
  }

  await enqueueReconciliation('import', { debounce: true })

  setResponseStatus(event, 201)
  return result
})
