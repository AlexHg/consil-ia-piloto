import { enqueueReconciliation } from '../../services/reconciliation/queue'

/**
 * Dispara una conciliación. Encola un job en pg-boss (procesamiento desacoplado)
 * y responde 202: el worker la ejecutará y persistirá el resultado.
 */
export default defineEventHandler(async (event) => {
  await enqueueReconciliation('manual')
  setResponseStatus(event, 202)
  return { enqueued: true }
})
