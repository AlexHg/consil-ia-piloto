/**
 * Integración del enriquecimiento con la cola pg-boss.
 *
 * - `enqueueEnrichment`: productor. Lo llama la ingesta tras persistir.
 * - `registerEnrichmentWorker`: consumidor. Lo registra el plugin de Nitro.
 *
 * El worker calcula embeddings e interpreta notas y, al terminar, encadena la
 * conciliación (`enqueueReconciliation`). Así la IA queda FUERA del camino
 * crítico: la ingesta responde de inmediato y el motor determinístico corre
 * sobre datos ya enriquecidos (o con fallback si la IA aún no terminó).
 */

import type { Job } from 'pg-boss'
import { QUEUES, useBoss } from '../../queue/boss'
import { enqueueReconciliation } from '../reconciliation/queue'
import { runEnrichment } from './enrichment'

interface EnrichmentJob {
  trigger?: string
}

interface EnqueueOptions {
  /** Colapsa ráfagas (p.ej. varias importaciones seguidas) en una sola ejecución. */
  debounce?: boolean
}

const DEBOUNCE_SECONDS = 2
const DEBOUNCE_KEY = 'enrichment'

export async function enqueueEnrichment(
  trigger = 'manual',
  options: EnqueueOptions = {}
): Promise<void> {
  try {
    const boss = await useBoss()
    const sendOptions = { retryLimit: 3, retryBackoff: true }

    if (options.debounce) {
      await boss.sendDebounced(
        QUEUES.enrichment,
        { trigger },
        sendOptions,
        DEBOUNCE_SECONDS,
        DEBOUNCE_KEY
      )
    } else {
      await boss.send(QUEUES.enrichment, { trigger }, sendOptions)
    }
  } catch (error) {
    // Encolar nunca debe tumbar la request de ingesta; como salvaguarda,
    // intentamos conciliar igualmente para no quedarnos sin resultados.
    console.error('[enrichment] no se pudo encolar el job', error)
    await enqueueReconciliation(trigger, { debounce: true })
  }
}

export async function registerEnrichmentWorker(): Promise<void> {
  const boss = await useBoss()

  await boss.work(QUEUES.enrichment, async (jobs: Job<EnrichmentJob>[]) => {
    const trigger = jobs[0]?.data?.trigger ?? 'manual'
    try {
      const summary = await runEnrichment()
      console.info(
        `[enrichment] (${trigger}) proveedor=${summary.provider} `
        + `invoices=${summary.invoices} payments=${summary.payments} `
        + `notes=${summary.notes} interpretadas=${summary.interpretedNotes}`
      )
    } catch (error) {
      console.error('[enrichment] fallo durante el enriquecimiento', error)
    } finally {
      // Pase lo que pase con la IA, conciliamos: el motor degrada con elegancia.
      await enqueueReconciliation(`post-enrichment:${trigger}`)
    }
  })
}
