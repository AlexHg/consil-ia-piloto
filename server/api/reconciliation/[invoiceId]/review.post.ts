import { reviewLatestReconciliation } from '../../../repositories/reconciliations.repository'
import type {
  ReconciliationReviewInput,
  ReconciliationReviewResult,
  ReviewAction
} from '~~/shared/types/domain'

const VALID_ACTIONS: ReviewAction[] = ['accept', 'correct']

// Sin sistema de auth todavía: el revisor se registra con un valor fijo.
const DEFAULT_ACTOR = 'reviewer'

/**
 * Registra la decisión humana sobre la conciliación de una factura.
 *
 * Endpoint delgado: valida el input y delega en el repositorio, que actualiza el
 * estado y deja el rastro auditable. La decisión la toma el humano sobre el
 * resultado del motor determinístico; la IA no interviene.
 */
export default defineEventHandler(async (event): Promise<ReconciliationReviewResult> => {
  const invoiceId = getRouterParam(event, 'invoiceId')

  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: 'Invoice identifier is required.' })
  }

  const body = await readBody<Partial<ReconciliationReviewInput>>(event)

  if (!body?.action || !VALID_ACTIONS.includes(body.action)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Action must be "accept" or "correct".'
    })
  }

  if (body.action === 'correct' && (!body.comment || !body.comment.trim())) {
    throw createError({
      statusCode: 422,
      statusMessage: 'A correction requires a comment explaining the reason.'
    })
  }

  return reviewLatestReconciliation(
    invoiceId,
    { action: body.action, comment: body.comment },
    DEFAULT_ACTOR
  )
})
