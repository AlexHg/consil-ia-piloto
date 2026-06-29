import { createInvoice } from '../services/ingestion'
import { enqueueEnrichment } from '../services/ai/queue'
import type { Invoice } from '~~/shared/types/domain'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Invoice>>(event)

  if (!body?.vendor || typeof body.vendor !== 'string' || !body.vendor.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Vendor is required.' })
  }
  if (body.amount == null || Number.isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Amount must be greater than 0.' })
  }

  const invoice = await createInvoice(body)
  await enqueueEnrichment('manual', { debounce: true })

  setResponseStatus(event, 201)
  return invoice
})
