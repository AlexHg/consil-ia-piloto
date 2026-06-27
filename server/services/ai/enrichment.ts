/**
 * Servicio de enriquecimiento (fuera del camino crítico).
 *
 * Calcula y persiste embeddings de facturas, pagos y notas, e interpreta las
 * notas operativas (resumen + IDs referenciados). Es idempotente: solo procesa
 * filas que aún no tienen `embedding` / `interpreted_summary`, de modo que puede
 * re-ejecutarse sin coste extra.
 *
 * Ningún fallo de IA debe propagarse: se loguea y se continúa. La conciliación
 * determinística funciona aunque el enriquecimiento no haya corrido (Evidence
 * Retrieval degrada a recuperar todos los registros).
 */

import {
  listInvoicesMissingEmbedding,
  updateInvoiceEmbedding
} from '../../repositories/invoices.repository'
import {
  listPaymentsMissingEmbedding,
  updatePaymentEmbedding
} from '../../repositories/payments.repository'
import {
  listNotesMissingEmbedding,
  listNotesMissingInterpretation,
  updateNoteEmbedding,
  updateNoteInterpretation
} from '../../repositories/notes.repository'
import { useAI } from './provider'
import { buildInvoiceText, buildNoteText, buildPaymentText, toVectorLiteral } from './embeddings'
import { interpretNote } from './enrich'

export interface EnrichmentSummary {
  provider: string
  invoices: number
  payments: number
  notes: number
  interpretedNotes: number
}

const EMBEDDING_BATCH = 64

/** Ejecuta el enriquecimiento pendiente y devuelve un resumen para auditoría. */
export async function runEnrichment(): Promise<EnrichmentSummary> {
  const ai = useAI()

  const [invoices, payments, notes] = await Promise.all([
    listInvoicesMissingEmbedding(),
    listPaymentsMissingEmbedding(),
    listNotesMissingEmbedding()
  ])

  const invoicesDone = await embedBatch(
    invoices.map(invoice => ({ id: invoice.id, text: buildInvoiceText(invoice) })),
    updateInvoiceEmbedding
  )

  const paymentsDone = await embedBatch(
    payments.map(payment => ({ id: payment.id, text: buildPaymentText(payment) })),
    updatePaymentEmbedding
  )

  const notesDone = await embedBatch(
    notes.map(record => ({ id: record.id, text: buildNoteText(record.note) })),
    updateNoteEmbedding
  )

  const interpretedNotes = await interpretPendingNotes()

  return {
    provider: ai.name,
    invoices: invoicesDone,
    payments: paymentsDone,
    notes: notesDone,
    interpretedNotes
  }
}

/** Calcula embeddings en lotes y los persiste vía `persist`. Devuelve el conteo. */
async function embedBatch(
  items: { id: string, text: string }[],
  persist: (id: string, literal: string) => Promise<void>
): Promise<number> {
  if (items.length === 0) return 0

  const ai = useAI()
  let done = 0

  for (let start = 0; start < items.length; start += EMBEDDING_BATCH) {
    const batch = items.slice(start, start + EMBEDDING_BATCH)
    try {
      const vectors = await ai.embed(batch.map(item => item.text))
      for (let i = 0; i < batch.length; i++) {
        const vector = vectors[i]
        if (!vector) continue
        await persist(batch[i]!.id, toVectorLiteral(vector))
        done++
      }
    } catch (error) {
      console.error('[enrichment] fallo al calcular embeddings del lote; se omite', error)
    }
  }

  return done
}

/** Interpreta (resumen + IDs) las notas pendientes. Devuelve el conteo. */
async function interpretPendingNotes(): Promise<number> {
  const pending = await listNotesMissingInterpretation()
  let done = 0

  for (const record of pending) {
    try {
      const { summary, referencedIds } = await interpretNote(record.note)
      await updateNoteInterpretation(record.id, summary, referencedIds)
      done++
    } catch (error) {
      console.error('[enrichment] fallo al interpretar nota; se omite', error)
    }
  }

  return done
}
