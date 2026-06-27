/**
 * Repositorio de conciliaciones.
 *
 * Persiste el resultado del motor determinístico (`ReconciliationResult`):
 * - cabecera en `reconciliations` (estado, confidence, señales, explicación);
 * - pagos vinculados (N:M) en `reconciliation_payments`.
 *
 * Toda escritura ocurre dentro de una transacción para mantener consistencia
 * entre la cabecera y sus pagos.
 */

import type { Selectable } from 'kysely'
import { useDb } from '../db/client'
import type { ReconciliationsTable } from '../db/types'
import type { ReconciliationResult } from '~~/shared/types/domain'
import { reconciliationFromRow, toMoney } from './mappers'

export async function createRun(trigger = 'manual', invoicesCount?: number): Promise<string> {
  const run = await useDb()
    .insertInto('reconciliation_runs')
    .values({ trigger, invoices_count: invoicesCount ?? null })
    .returning('id')
    .executeTakeFirstOrThrow()
  return run.id
}

export async function finishRun(runId: string): Promise<void> {
  await useDb()
    .updateTable('reconciliation_runs')
    .set({ finished_at: new Date() })
    .where('id', '=', runId)
    .execute()
}

export interface LatestRun {
  id: string
  trigger: string
  invoicesCount: number | null
  startedAt: Date
  finishedAt: Date | null
}

/** Corrida más reciente (en proceso o finalizada). La UI la consulta para refrescar. */
export async function getLatestRun(): Promise<LatestRun | null> {
  const row = await useDb()
    .selectFrom('reconciliation_runs')
    .select(['id', 'trigger', 'invoices_count', 'started_at', 'finished_at'])
    .orderBy('started_at', 'desc')
    .executeTakeFirst()

  if (!row) return null

  return {
    id: row.id,
    trigger: row.trigger,
    invoicesCount: row.invoices_count,
    startedAt: new Date(row.started_at as unknown as string),
    finishedAt: row.finished_at ? new Date(row.finished_at as unknown as string) : null
  }
}

/**
 * Persiste un lote de resultados bajo un mismo `runId`. Devuelve los IDs creados.
 */
export async function saveResults(
  results: ReconciliationResult[],
  runId?: string
): Promise<string[]> {
  if (results.length === 0) return []

  return useDb().transaction().execute(async (trx) => {
    const createdIds: string[] = []

    for (const result of results) {
      const row = await trx
        .insertInto('reconciliations')
        .values({
          invoice_id: result.invoiceId,
          status: result.status,
          confidence: result.confidence.toFixed(4),
          remaining_balance: result.remainingBalance == null ? null : toMoney(result.remainingBalance),
          suggested_action: result.suggestedAction,
          explanation: result.explanation,
          signals: JSON.stringify(result.signals),
          run_id: runId ?? null
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      createdIds.push(row.id)

      if (result.matchedPaymentIds.length > 0) {
        await trx
          .insertInto('reconciliation_payments')
          .values(result.matchedPaymentIds.map(paymentId => ({
            reconciliation_id: row.id,
            payment_id: paymentId
          })))
          .execute()
      }
    }

    return createdIds
  })
}

async function attachPayments(
  rows: Selectable<ReconciliationsTable>[]
): Promise<ReconciliationResult[]> {
  if (rows.length === 0) return []

  const ids = rows.map(row => row.id)
  const links = await useDb()
    .selectFrom('reconciliation_payments')
    .select(['reconciliation_id', 'payment_id'])
    .where('reconciliation_id', 'in', ids)
    .execute()

  const byReconciliation = new Map<string, string[]>()
  for (const link of links) {
    const list = byReconciliation.get(link.reconciliation_id) ?? []
    list.push(link.payment_id)
    byReconciliation.set(link.reconciliation_id, list)
  }

  return rows.map(row => reconciliationFromRow(row, byReconciliation.get(row.id) ?? []))
}

/**
 * Última conciliación por factura (la corrida más reciente supera a las previas).
 * Usa `DISTINCT ON (invoice_id)` ordenando por `created_at` descendente.
 */
export async function listReconciliations(): Promise<ReconciliationResult[]> {
  const rows = await useDb()
    .selectFrom('reconciliations')
    .selectAll()
    .distinctOn('invoice_id')
    .orderBy('invoice_id')
    .orderBy('created_at', 'desc')
    .execute()
  return attachPayments(rows)
}

export async function findReconciliationsByInvoice(invoiceId: string): Promise<ReconciliationResult[]> {
  const rows = await useDb()
    .selectFrom('reconciliations')
    .selectAll()
    .where('invoice_id', '=', invoiceId)
    .orderBy('created_at')
    .execute()
  return attachPayments(rows)
}
