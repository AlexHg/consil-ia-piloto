import type {
  ReconciliationReviewInput,
  ReconciliationReviewResult,
  ReconciliationRunStatus
} from '~~/shared/types/domain'
import { extractErrorMessage } from '~/utils/pools'
import { reconciliationLabel } from '~/utils/format'

/**
 * Orquesta la ejecución del pipeline de conciliación desde la UI.
 *
 * La conciliación se procesa de forma asíncrona (cola pg-boss): este composable
 * encola la corrida, hace polling del estado hasta detectar que terminó y luego
 * refresca los datos del dashboard. La UI nunca corre lógica de negocio; solo
 * consume los endpoints internos de Nitro.
 *
 * El estado (`running` y `progress`) se comparte vía `useState`, de modo que el
 * card de progreso flotante refleja la corrida sin importar desde qué pantalla
 * se disparó.
 */

const POLL_INTERVAL_MS = 700
const POLL_TIMEOUT_MS = 20000

/** Tiempo que el card permanece visible tras terminar antes de auto-ocultarse. */
const DISMISS_DONE_MS = 4000
const DISMISS_ERROR_MS = 7000

const REFRESH_KEYS = [
  'reconciliation-results',
  'reconciliation-summary',
  'pool-invoices',
  'pool-payments',
  'pool-notes'
]

/**
 * Fases del card de progreso. El backend no expone avance granular (la cola solo
 * informa inicio/fin), así que el porcentaje se anima de forma asintótica durante
 * el polling y salta a 100% al detectar la corrida finalizada.
 */
export type ReconciliationPhase = 'idle' | 'queueing' | 'processing' | 'done' | 'error'

export interface ReconciliationProgress {
  phase: ReconciliationPhase
  /** Avance estimado 0–100 para la barra. */
  percent: number
  title: string
  message: string
  invoicesCount: number | null
}

function idleProgress(): ReconciliationProgress {
  return { phase: 'idle', percent: 0, title: '', message: '', invoicesCount: null }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useReconciliation() {
  const toast = useToast()
  const running = useState<boolean>('reconciliation:running', () => false)
  const progress = useState<ReconciliationProgress>('reconciliation:progress', idleProgress)
  const reviewingId = ref<string | null>(null)

  let dismissTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleDismiss(delay: number) {
    if (!import.meta.client) return
    if (dismissTimer) clearTimeout(dismissTimer)
    dismissTimer = setTimeout(() => {
      // No ocultar si entretanto se inició otra corrida.
      if (!running.value) progress.value = idleProgress()
    }, delay)
  }

  /** Oculta el card manualmente (botón cerrar). */
  function dismissProgress() {
    if (dismissTimer) clearTimeout(dismissTimer)
    progress.value = idleProgress()
  }

  /** Avance asintótico hacia un techo mientras esperamos a que termine la corrida. */
  function nudgeProgress(ceiling = 92) {
    const current = progress.value.percent
    if (current >= ceiling) return
    progress.value = {
      ...progress.value,
      percent: Math.min(ceiling, current + (ceiling - current) * 0.28)
    }
  }

  /** Espera a que aparezca una corrida nueva (distinta a la previa) ya finalizada. */
  async function waitForNewRun(before: ReconciliationRunStatus): Promise<ReconciliationRunStatus | null> {
    const deadline = Date.now() + POLL_TIMEOUT_MS

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS)
      nudgeProgress()
      const status = await $fetch<ReconciliationRunStatus>('/api/reconciliation/status')
      const isNewRun = status.runId != null && status.runId !== before.runId
      if (isNewRun && status.invoicesCount != null) {
        progress.value = { ...progress.value, invoicesCount: status.invoicesCount }
      }
      if (isNewRun && !status.running && status.finishedAt) {
        return status
      }
    }

    return null
  }

  async function run(): Promise<void> {
    if (running.value) return
    if (dismissTimer) clearTimeout(dismissTimer)
    running.value = true
    progress.value = {
      phase: 'queueing',
      percent: 8,
      title: 'Queueing reconciliation',
      message: 'Preparing the deterministic engine run…',
      invoicesCount: null
    }

    try {
      const before = await $fetch<ReconciliationRunStatus>('/api/reconciliation/status')

      await $fetch('/api/reconciliation/run', { method: 'POST' })

      progress.value = {
        phase: 'processing',
        percent: 22,
        title: 'Processing invoices',
        message: 'The deterministic engine is reconciling the pools.',
        invoicesCount: before.invoicesCount
      }

      const finished = await waitForNewRun(before)
      await refreshNuxtData(REFRESH_KEYS)

      if (finished) {
        const count = finished.invoicesCount ?? 0
        progress.value = {
          phase: 'done',
          percent: 100,
          title: 'Reconciliation complete',
          message: `${count} ${count === 1 ? 'invoice processed' : 'invoices processed'}.`,
          invoicesCount: count
        }
        scheduleDismiss(DISMISS_DONE_MS)
      } else {
        progress.value = {
          phase: 'done',
          percent: 100,
          title: 'Reconciliation queued',
          message: 'Results will update in a few moments.',
          invoicesCount: null
        }
        scheduleDismiss(DISMISS_DONE_MS)
      }
    } catch (error) {
      progress.value = {
        phase: 'error',
        percent: 100,
        title: 'Could not run reconciliation',
        message: extractErrorMessage(error),
        invoicesCount: null
      }
      scheduleDismiss(DISMISS_ERROR_MS)
    } finally {
      running.value = false
    }
  }

  /**
   * Registra la decisión humana (aceptar/corregir) sobre la conciliación de una
   * factura y refresca el dashboard. La decisión la toma el revisor; el backend
   * solo persiste el cambio de estado de forma auditable.
   */
  async function review(invoiceId: string, input: ReconciliationReviewInput): Promise<boolean> {
    if (reviewingId.value) return false
    reviewingId.value = invoiceId

    try {
      const result = await $fetch<ReconciliationReviewResult>(
        `/api/reconciliation/${encodeURIComponent(invoiceId)}/review`,
        { method: 'POST', body: input }
      )

      await refreshNuxtData(REFRESH_KEYS)

      toast.add({
        title: input.action === 'accept' ? 'Reconciliation accepted' : 'Sent for review',
        description: `${invoiceId} is now in "${reconciliationLabel(result.newStatus)}" status.`,
        color: 'success',
        icon: input.action === 'accept' ? 'i-lucide-check' : 'i-lucide-pencil'
      })

      return true
    } catch (error) {
      toast.add({
        title: 'Could not record decision',
        description: extractErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-x'
      })
      return false
    } finally {
      reviewingId.value = null
    }
  }

  return { running, progress, run, review, reviewingId, dismissProgress }
}
