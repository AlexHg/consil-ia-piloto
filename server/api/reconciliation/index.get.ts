import { loadInvoices, loadPayments, loadNotes } from '../../services/ingestion'
import { reconcileAll } from '../../services/reconciliation/engine'

export default defineEventHandler(async () => {
  const [invoices, payments, notes] = await Promise.all([
    loadInvoices(),
    loadPayments(),
    loadNotes()
  ])

  return reconcileAll(invoices, payments, notes)
})
