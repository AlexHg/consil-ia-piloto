import { listReconciliations } from '../../repositories/reconciliations.repository'
import type { ReconciliationSummary } from '~~/shared/types/domain'

export default defineEventHandler(async (): Promise<ReconciliationSummary> => {
  const results = await listReconciliations()
  const total = results.length || 1

  const count = (status: string) => results.filter(r => r.status === status).length
  const matched = count('Matched')
  const partial = count('Partial Match')
  const needsReview = count('Needs Review')
  const unmatched = count('Unmatched')
  const suspicious = count('Suspicious')

  return {
    total: results.length,
    matched,
    partial,
    needsReview,
    unmatched,
    suspicious,
    pending: partial + needsReview + unmatched + suspicious,
    autoMatchRate: Number(((matched / total) * 100).toFixed(1))
  }
})
