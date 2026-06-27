import type { ReconciliationResult, ReconciliationStatus } from '~~/shared/types/domain'

/**
 * Estado de conciliación **derivado** por pago.
 *
 * No existe un estado almacenado en el pago: el motor es invoice-centric y la
 * decisión vive en `ReconciliationResult`. Aquí solo se proyecta ese resultado
 * sobre los pagos, igual que el dashboard hace con las facturas. Así nunca puede
 * divergir de la decisión determinística ni se altera el motor.
 *
 * - Un pago vinculado a una conciliación hereda su estado.
 * - Si un pago aparece en varias, gana el de mayor prioridad de atención
 *   (Sospechoso > Revisión > Parcial > Aplicado).
 * - Tras una corrida, un pago no vinculado a ninguna factura es `Unmatched`
 *   (huérfano). Sin corrida previa no se asigna estado (sin badge).
 */
export function usePaymentStatuses() {
  const { data: results } = useFetch<ReconciliationResult[]>('/api/reconciliation', {
    key: 'reconciliation-results',
    default: () => []
  })

  const PRIORITY: Record<ReconciliationStatus, number> = {
    'Suspicious': 0,
    'Needs Review': 1,
    'Partial Match': 2,
    'Matched': 3,
    'Unmatched': 4
  }

  const statusByPayment = computed(() => {
    const map = new Map<string, ReconciliationStatus>()
    for (const result of results.value) {
      for (const paymentId of result.matchedPaymentIds) {
        const current = map.get(paymentId)
        if (!current || PRIORITY[result.status] < PRIORITY[current]) {
          map.set(paymentId, result.status)
        }
      }
    }
    return map
  })

  const hasResults = computed(() => results.value.length > 0)

  /**
   * Estado derivado de un pago. Devuelve `undefined` si todavía no hay una
   * corrida (para no marcar todo como huérfano antes de conciliar).
   */
  function paymentStatus(paymentId: string): ReconciliationStatus | undefined {
    if (!hasResults.value) return undefined
    return statusByPayment.value.get(paymentId) ?? 'Unmatched'
  }

  return { statusByPayment, hasResults, paymentStatus }
}
