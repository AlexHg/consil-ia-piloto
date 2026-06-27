/**
 * Evidence Retrieval.
 *
 * Recupera CANDIDATOS para conciliar una factura usando búsqueda vectorial
 * (`pgvector`, índices HNSW con distancia coseno). Es importante: la búsqueda
 * vectorial SOLO recupera candidatos; las reglas del motor determinístico
 * (`reconciliation/engine.ts`) son las que deciden el match.
 *
 * Si la factura aún no tiene `embedding` (el enriquecimiento no ha corrido, o se
 * usa el proveedor mock antes de procesar), se degrada a devolver TODOS los
 * registros, preservando el comportamiento previo del motor.
 */

import { sql } from 'kysely'
import { useDb } from '../../db/client'
import { paymentFromRow, noteFromRow } from '../../repositories/mappers'
import { listNotes } from '../../repositories/notes.repository'
import { listPayments } from '../../repositories/payments.repository'
import type { Invoice, OperationalNote, Payment } from '~~/shared/types/domain'

export interface ScoredPayment {
  payment: Payment
  /** Similitud coseno en [0,1]; 0 cuando proviene del fallback sin embedding. */
  similarity: number
}

export interface ScoredNote {
  note: OperationalNote
  similarity: number
}

// Límites generosos: pgvector ORDENA y puntúa los candidatos, pero el conjunto
// que llega al motor es lo bastante amplio para no descartar coincidencias
// deterministas (referencia/monto). Así la decisión es idéntica con IA real o
// mock; la calidad del embedding solo afecta el orden y la señal semántica.
const DEFAULT_PAYMENT_K = 50
const DEFAULT_NOTE_K = 20

/** `true` si la factura tiene embedding calculado en la BD. */
async function invoiceHasEmbedding(invoiceId: string): Promise<boolean> {
  const row = await useDb()
    .selectFrom('invoices')
    .select('id')
    .where('id', '=', invoiceId)
    .where('embedding', 'is not', null)
    .executeTakeFirst()
  return row != null
}

/**
 * Pagos candidatos para una factura, ordenados por similitud vectorial.
 * Fallback: todos los pagos (similitud 0) si no hay embedding de la factura.
 */
export async function retrieveCandidatePayments(
  invoice: Invoice,
  k = DEFAULT_PAYMENT_K
): Promise<ScoredPayment[]> {
  if (!(await invoiceHasEmbedding(invoice.id))) {
    const all = await listPayments()
    return all.map(payment => ({ payment, similarity: 0 }))
  }

  const invoiceEmbedding = sql`(select embedding from invoices where id = ${invoice.id})`

  const rows = await useDb()
    .selectFrom('payments')
    .selectAll('payments')
    .select(sql<number>`1 - (payments.embedding <=> ${invoiceEmbedding})`.as('similarity'))
    .where('payments.embedding', 'is not', null)
    .orderBy(sql`payments.embedding <=> ${invoiceEmbedding}`)
    .limit(k)
    .execute()

  return rows.map(row => ({
    payment: paymentFromRow(row),
    similarity: clampSimilarity(row.similarity)
  }))
}

/**
 * Notas relacionadas con una factura, ordenadas por similitud vectorial.
 * Fallback: todas las notas (similitud 0) si no hay embedding de la factura.
 */
export async function retrieveRelatedNotes(
  invoice: Invoice,
  k = DEFAULT_NOTE_K
): Promise<ScoredNote[]> {
  if (!(await invoiceHasEmbedding(invoice.id))) {
    const all = await listNotes()
    return all.map(note => ({ note, similarity: 0 }))
  }

  const invoiceEmbedding = sql`(select embedding from invoices where id = ${invoice.id})`

  const rows = await useDb()
    .selectFrom('notes')
    .selectAll('notes')
    .select(sql<number>`1 - (notes.embedding <=> ${invoiceEmbedding})`.as('similarity'))
    .where('notes.embedding', 'is not', null)
    .orderBy(sql`notes.embedding <=> ${invoiceEmbedding}`)
    .limit(k)
    .execute()

  return rows.map(row => ({
    note: noteFromRow(row),
    similarity: clampSimilarity(row.similarity)
  }))
}

/** La similitud puede venir como `string` (driver pg) o fuera de rango; se acota. */
function clampSimilarity(value: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
  if (!Number.isFinite(parsed)) return 0
  return Math.min(1, Math.max(0, parsed))
}
