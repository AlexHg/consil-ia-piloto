import { loadInvoices, loadPayments, loadNotes } from '../../services/ingestion'
import { reconcileAll } from '../../services/reconciliation/engine'
import type { ReconciliationSummary } from '~~/shared/types/domain'

export default defineEventHandler(async (): Promise<ReconciliationSummary> => {
  const [invoices, payments, notes] = await Promise.all([
    loadInvoices(),
    loadPayments(),
    loadNotes()
  ])

  const results = reconcileAll(invoices, payments, notes)
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
