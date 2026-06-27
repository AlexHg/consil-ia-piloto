import type { ReconciliationRunStatus } from '~~/shared/types/domain'
import { extractErrorMessage } from '~/utils/pools'

/**
 * Orquesta la ejecución del pipeline de conciliación desde la UI.
 *
 * La conciliación se procesa de forma asíncrona (cola pg-boss): este composable
 * encola la corrida, hace polling del estado hasta detectar que terminó y luego
 * refresca los datos del dashboard. La UI nunca corre lógica de negocio; solo
 * consume los endpoints internos de Nitro.
 */

const POLL_INTERVAL_MS = 700
const POLL_TIMEOUT_MS = 20000

const REFRESH_KEYS = [
  'reconciliation-results',
  'reconciliation-summary',
  'pool-invoices',
  'pool-payments',
  'pool-notes'
]

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Espera a que aparezca una corrida nueva (distinta a la previa) ya finalizada. */
async function waitForNewRun(before: ReconciliationRunStatus): Promise<ReconciliationRunStatus | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const status = await $fetch<ReconciliationRunStatus>('/api/reconciliation/status')
    const isNewRun = status.runId != null && status.runId !== before.runId
    if (isNewRun && !status.running && status.finishedAt) {
      return status
    }
  }

  return null
}

export function useReconciliation() {
  const toast = useToast()
  const running = ref(false)

  async function run(): Promise<void> {
    if (running.value) return
    running.value = true

    try {
      const before = await $fetch<ReconciliationRunStatus>('/api/reconciliation/status')

      await $fetch('/api/reconciliation/run', { method: 'POST' })

      toast.add({
        title: 'Conciliación en proceso',
        description: 'El motor determinístico está procesando las facturas.',
        color: 'info',
        icon: 'i-lucide-loader'
      })

      const finished = await waitForNewRun(before)
      await refreshNuxtData(REFRESH_KEYS)

      if (finished) {
        const count = finished.invoicesCount ?? 0
        toast.add({
          title: 'Conciliación completada',
          description: `${count} ${count === 1 ? 'factura procesada' : 'facturas procesadas'}.`,
          color: 'success',
          icon: 'i-lucide-check'
        })
      } else {
        toast.add({
          title: 'Conciliación encolada',
          description: 'El resultado se actualizará en unos instantes.',
          color: 'warning',
          icon: 'i-lucide-clock'
        })
      }
    } catch (error) {
      toast.add({
        title: 'No se pudo ejecutar la conciliación',
        description: extractErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-x'
      })
    } finally {
      running.value = false
    }
  }

  return { running, run }
}
