import { createInvoice } from '../services/ingestion'
import { enqueueReconciliation } from '../services/reconciliation/queue'
import type { Invoice } from '~~/shared/types/domain'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Invoice>>(event)

  if (!body?.vendor || typeof body.vendor !== 'string' || !body.vendor.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'El proveedor es obligatorio.' })
  }
  if (body.amount == null || Number.isNaN(Number(body.amount)) || Number(body.amount) <= 0) {
    throw createError({ statusCode: 422, statusMessage: 'El monto debe ser mayor a 0.' })
  }

  const invoice = await createInvoice(body)
  await enqueueReconciliation('manual', { debounce: true })

  setResponseStatus(event, 201)
  return invoice
})
