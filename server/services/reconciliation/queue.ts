/**
 * Integración de la conciliación con la cola pg-boss.
 *
 * - `enqueueReconciliation`: productor. Lo llaman la ingesta (tras persistir) y
 *   el endpoint de ejecución manual.
 * - `registerReconciliationWorker`: consumidor. Lo registra el plugin de Nitro
 *   al arrancar el servidor.
 *
 * La cola desacopla ingesta y conciliación. La IA nunca está en el camino
 * crítico: el worker corre el motor determinístico y persiste el resultado.
 */

import type { Job } from 'pg-boss'
import { QUEUES, useBoss } from '../../queue/boss'
import { runReconciliation } from './service'

interface ReconciliationJob {
  trigger?: string
}

interface EnqueueOptions {
  /** Colapsa ráfagas (p.ej. varias importaciones seguidas) en una sola ejecución. */
  debounce?: boolean
}

const DEBOUNCE_SECONDS = 2
const DEBOUNCE_KEY = 'reconciliation'

export async function enqueueReconciliation(
  trigger = 'manual',
  options: EnqueueOptions = {}
): Promise<void> {
  try {
    const boss = await useBoss()
    const sendOptions = { retryLimit: 3, retryBackoff: true }

    if (options.debounce) {
      await boss.sendDebounced(
        QUEUES.reconciliation,
        { trigger },
        sendOptions,
        DEBOUNCE_SECONDS,
        DEBOUNCE_KEY
      )
    } else {
      await boss.send(QUEUES.reconciliation, { trigger }, sendOptions)
    }
  } catch (error) {
    // Encolar nunca debe tumbar la request de ingesta.
    console.error('[reconciliation] no se pudo encolar el job', error)
  }
}

export async function registerReconciliationWorker(): Promise<void> {
  const boss = await useBoss()

  await boss.work(QUEUES.reconciliation, async (jobs: Job<ReconciliationJob>[]) => {
    // El handler recibe un lote; basta una ejecución (recalcula todo el estado).
    const trigger = jobs[0]?.data?.trigger ?? 'manual'
    const { runId, count } = await runReconciliation(trigger)
    console.info(`[reconciliation] run ${runId} (${trigger}): ${count} resultados`)
  })
}
