import type {
  Invoice,
  Payment,
  OperationalNote,
  ReconciliationSummary
} from '~~/shared/types/domain'

/**
 * Acceso unificado a los pools de conocimiento desde la UI.
 *
 * La interfaz solo consume los endpoints internos de Nuxt Server; nunca lee
 * archivos ni conoce el origen de la información. `useFetch` deduplica por
 * clave, por lo que estos datos se comparten entre el layout y las páginas.
 */
export function usePools() {
  const { data: invoices, pending: invoicesPending } = useFetch<Invoice[]>('/api/invoices', {
    key: 'pool-invoices',
    default: () => []
  })

  const { data: payments, pending: paymentsPending } = useFetch<Payment[]>('/api/payments', {
    key: 'pool-payments',
    default: () => []
  })

  const { data: notes, pending: notesPending } = useFetch<OperationalNote[]>('/api/notes', {
    key: 'pool-notes',
    default: () => []
  })

  const { data: summary, pending: summaryPending } = useFetch<ReconciliationSummary>('/api/reconciliation/summary', {
    key: 'reconciliation-summary',
    default: () => ({
      total: 0,
      matched: 0,
      partial: 0,
      needsReview: 0,
      unmatched: 0,
      suspicious: 0,
      pending: 0,
      autoMatchRate: 0
    })
  })

  const pending = computed(() =>
    invoicesPending.value || paymentsPending.value || notesPending.value || summaryPending.value
  )

  return { invoices, payments, notes, summary, pending }
}
