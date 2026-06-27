/**
 * Servicio de conciliación.
 *
 * Orquesta una ejecución completa del motor determinístico y persiste el
 * resultado de forma auditable. NO contiene reglas de negocio (viven en
 * `engine.ts`) ni lógica de cola (vive en `queue.ts`): solo coordina evidencia,
 * motor, enriquecimiento de IA y repositorios.
 *
 * Flujo por factura:
 *   Evidence Retrieval (pgvector recupera candidatos)
 *     → Rule Engine (determinístico decide)
 *     → señal semántica informativa (no decide)
 *     → explicación enriquecida por IA (post-decisión, no altera la decisión)
 *     → persistencia
 */

import { loadInvoices } from '../ingestion'
import { reconcileInvoice } from './engine'
import { retrieveCandidatePayments, retrieveRelatedNotes } from '../evidence/retrieval'
import { enrichExplanation } from '../ai/enrich'
import { createRun, finishRun, saveResults } from '../../repositories/reconciliations.repository'
import type { ReconciliationResult } from '~~/shared/types/domain'

export interface RunSummary {
  runId: string
  count: number
}

/**
 * Ejecuta la conciliación sobre el estado actual de los pools y la persiste
 * bajo un `reconciliation_run`. La decisión es 100% determinística; la IA solo
 * recupera candidatos (embeddings) y redacta la explicación.
 */
export async function runReconciliation(trigger = 'manual'): Promise<RunSummary> {
  const invoices = await loadInvoices()
  const runId = await createRun(trigger, invoices.length)

  const results: ReconciliationResult[] = []

  for (const invoice of invoices) {
    const [scoredPayments, scoredNotes] = await Promise.all([
      retrieveCandidatePayments(invoice),
      retrieveRelatedNotes(invoice)
    ])

    const candidatePayments = scoredPayments.map(scored => scored.payment)
    const relatedNotes = scoredNotes.map(scored => scored.note)

    // El motor decide (determinístico). engine.ts permanece intacto.
    const result = reconcileInvoice(invoice, candidatePayments, relatedNotes)

    appendSemanticSignal(result, scoredPayments)

    // Enriquecimiento de IA: solo reescribe el texto de la explicación.
    result.explanation = await enrichExplanation(result, invoice, candidatePayments, relatedNotes)

    results.push(result)
  }

  await saveResults(results, runId)
  await finishRun(runId)

  return { runId, count: results.length }
}

/**
 * Añade una señal `semantic` informativa con la mejor similitud vectorial entre
 * los pagos efectivamente vinculados. `weight: 0` → no afecta el `confidence`
 * ya calculado por el motor; solo deja la evidencia vectorial auditada.
 */
function appendSemanticSignal(
  result: ReconciliationResult,
  scoredPayments: { payment: { id: string }, similarity: number }[]
): void {
  const matched = scoredPayments.filter(scored =>
    result.matchedPaymentIds.includes(scored.payment.id))
  const best = matched.reduce((max, scored) => Math.max(max, scored.similarity), 0)
  const hasEmbeddings = scoredPayments.some(scored => scored.similarity > 0)

  result.signals.push({
    key: 'semantic',
    label: 'Similitud semántica (pgvector)',
    weight: 0,
    matched: best > 0,
    detail: buildSemanticDetail(hasEmbeddings, best)
  })
}

function buildSemanticDetail(hasEmbeddings: boolean, best: number): string {
  if (!hasEmbeddings) return 'Embeddings no disponibles (recuperación por fallback)'
  if (best > 0) return `${(best * 100).toFixed(0)}% con el mejor pago vinculado`
  return 'Sin similitud relevante entre los candidatos'
}
