import { getLatestRun } from '../../repositories/reconciliations.repository'
import type { ReconciliationRunStatus } from '~~/shared/types/domain'

/**
 * Estado de la corrida más reciente del motor de conciliación.
 *
 * Como la ejecución es asíncrona (cola pg-boss), la UI consulta este endpoint
 * tras encolar para detectar cuándo terminó y refrescar el dashboard.
 */
export default defineEventHandler(async (): Promise<ReconciliationRunStatus> => {
  const run = await getLatestRun()

  if (!run) {
    return {
      runId: null,
      trigger: 'none',
      invoicesCount: null,
      startedAt: null,
      finishedAt: null,
      running: false
    }
  }

  return {
    runId: run.id,
    trigger: run.trigger,
    invoicesCount: run.invoicesCount,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    running: run.finishedAt == null
  }
})
