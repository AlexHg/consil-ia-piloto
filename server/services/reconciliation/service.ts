/**
 * Servicio de conciliación.
 *
 * Orquesta una ejecución completa del motor determinístico y persiste el
 * resultado de forma auditable. NO contiene reglas de negocio (viven en
 * `engine.ts`) ni lógica de cola (vive en `queue.ts`): solo coordina pools,
 * motor y repositorios.
 */

import { loadInvoices, loadNotes, loadPayments } from '../ingestion'
import { reconcileAll } from './engine'
import { createRun, finishRun, saveResults } from '../../repositories/reconciliations.repository'

export interface RunSummary {
  runId: string
  count: number
}

/**
 * Ejecuta la conciliación sobre el estado actual de los pools y la persiste
 * bajo un `reconciliation_run`. La decisión es 100% determinística.
 */
export async function runReconciliation(trigger = 'manual'): Promise<RunSummary> {
  const [invoices, payments, notes] = await Promise.all([
    loadInvoices(),
    loadPayments(),
    loadNotes()
  ])

  const runId = await createRun(trigger, invoices.length)
  const results = reconcileAll(invoices, payments, notes)
  await saveResults(results, runId)
  await finishRun(runId)

  return { runId, count: results.length }
}
