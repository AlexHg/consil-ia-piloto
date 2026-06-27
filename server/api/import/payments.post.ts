import { importPaymentsCsv } from '../../services/ingestion'
import { enqueueReconciliation } from '../../services/reconciliation/queue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ csv?: string }>(event)

  if (!body?.csv || typeof body.csv !== 'string' || !body.csv.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El contenido CSV está vacío.' })
  }

  const result = await importPaymentsCsv(body.csv)

  if (result.created === 0) {
    throw createError({ statusCode: 422, statusMessage: 'No se encontraron filas válidas en el CSV.' })
  }

  await enqueueReconciliation('import', { debounce: true })

  setResponseStatus(event, 201)
  return result
})
