import { createPayment } from '../services/ingestion'
import { enqueueEnrichment } from '../services/ai/queue'
import type { Payment } from '~~/shared/types/domain'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Payment>>(event)

  if (!body?.payerName || typeof body.payerName !== 'string' || !body.payerName.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Payer name is required.' })
  }
  if (body.amount == null || Number.isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'Amount must be greater than 0.' })
  }

  const payment = await createPayment(body)
  await enqueueEnrichment('manual', { debounce: true })

  setResponseStatus(event, 201)
  return payment
})
