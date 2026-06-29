/**
 * Enriquecimiento con IA (texto, no decisiones).
 *
 * - `interpretNote`: resume una nota operativa y extrae los IDs que referencia.
 * - `enrichExplanation`: redacta en lenguaje natural la explicación de una
 *   conciliación YA decidida por el motor determinístico.
 *
 * Garantías:
 * - La IA nunca altera `status`, `confidence` ni `matchedPaymentIds`.
 * - Si no hay proveedor real (mock) o falla la llamada, se degrada a una salida
 *   determinística (regex / plantilla del motor). El flujo nunca se rompe.
 */

import type {
  Invoice,
  OperationalNote,
  Payment,
  ReconciliationResult
} from '~~/shared/types/domain'
import { useAI } from './provider'

export interface NoteInterpretation {
  summary: string
  referencedIds: string[]
}

/** Extrae IDs tipo `INV-123`, `PAY-12`, `PO-3344` del texto (determinístico). */
function extractReferencedIds(text: string): string[] {
  const matches = text.match(/\b(?:INV|PAY|PO)[-\s]?\d+\b/gi) ?? []
  const normalized = matches.map(token => token.replace(/\s+/g, '-').toUpperCase())
  return Array.from(new Set(normalized))
}

/**
 * Interpreta una nota: resumen breve + IDs referenciados. La extracción de IDs
 * por regex actúa como base determinística; la IA solo aporta el resumen y, si
 * está disponible, IDs adicionales.
 */
export async function interpretNote(note: OperationalNote): Promise<NoteInterpretation> {
  const baseIds = extractReferencedIds(note.text)
  const ai = useAI()

  if (!ai.isLive) {
    return { summary: note.text.trim(), referencedIds: baseIds }
  }

  try {
    const raw = await ai.complete(note.text, {
      system:
        'You are a financial reconciliation assistant. Summarize the operational note in one sentence '
        + 'and list the identifiers it mentions (invoices INV-, payments PAY-, orders PO-). '
        + 'Respond ONLY with JSON: {"summary": string, "referencedIds": string[]}.',
      maxTokens: 200
    })

    const parsed = JSON.parse(extractJson(raw)) as Partial<NoteInterpretation>
    const aiIds = Array.isArray(parsed.referencedIds)
      ? parsed.referencedIds.map(id => String(id).toUpperCase())
      : []
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : note.text.trim()

    return {
      summary,
      referencedIds: Array.from(new Set([...baseIds, ...aiIds]))
    }
  } catch (error) {
    console.error('[ai] interpretNote fell back to deterministic output', error)
    return { summary: note.text.trim(), referencedIds: baseIds }
  }
}

/**
 * Redacta una explicación en lenguaje natural para una conciliación ya decidida.
 * Devuelve `result.explanation` (la plantilla determinística) si la IA no está
 * disponible o falla: la explicación siempre existe y es coherente con la decisión.
 */
export async function enrichExplanation(
  result: ReconciliationResult,
  invoice: Invoice,
  payments: Payment[],
  notes: OperationalNote[]
): Promise<string> {
  const ai = useAI()
  if (!ai.isLive) return result.explanation

  try {
    const context = buildExplanationContext(result, invoice, payments, notes)
    const text = await ai.complete(context, {
      system:
        'You are a reconciliation analyst. Explain clearly and briefly (2-3 sentences) why '
        + 'the invoice received this status, based EXCLUSIVELY on the evidence and the decision '
        + 'already made. Do not invent data or change the decision. Write in English.',
      maxTokens: 220
    })
    return text.trim() || result.explanation
  } catch (error) {
    console.error('[ai] enrichExplanation fell back to deterministic template', error)
    return result.explanation
  }
}

/** Serializa la evidencia y la decisión para alimentar la explicación de IA. */
function buildExplanationContext(
  result: ReconciliationResult,
  invoice: Invoice,
  payments: Payment[],
  notes: OperationalNote[]
): string {
  const signals = result.signals
    .map(signal => `- ${signal.label}: ${signal.matched ? 'match' : 'no match'}${signal.detail ? ` (${signal.detail})` : ''}`)
    .join('\n')

  const matchedPayments = payments
    .filter(payment => result.matchedPaymentIds.includes(payment.id))
    .map(payment => `${payment.id} · ${payment.amount} ${payment.currency} · ref ${payment.reference ?? 'no reference'}`)
    .join('; ') || 'none'

  const relatedNotes = notes.length > 0
    ? notes.map(note => `(${note.source}) ${note.text}`).join(' | ')
    : 'none'

  return [
    `Invoice: ${invoice.id} — ${invoice.vendor} — ${invoice.amount} ${invoice.currency}`,
    `Decided status: ${result.status} (confidence ${(result.confidence * 100).toFixed(0)}%)`,
    `Remaining balance: ${result.remainingBalance ?? 'n/a'}`,
    `Suggested action: ${result.suggestedAction}`,
    `Linked payments: ${matchedPayments}`,
    `Related notes: ${relatedNotes}`,
    'Evidence signals:',
    signals
  ].join('\n')
}

/** Extrae el primer bloque JSON de una respuesta que puede traer texto extra. */
function extractJson(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return raw.slice(start, end + 1)
  return raw
}
