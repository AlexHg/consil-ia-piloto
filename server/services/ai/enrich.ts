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
        'Eres un asistente de conciliación financiera. Resume la nota operativa en una frase '
        + 'y lista los identificadores que menciona (facturas INV-, pagos PAY-, órdenes PO-). '
        + 'Responde SOLO con JSON: {"summary": string, "referencedIds": string[]}.',
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
    console.error('[ai] interpretNote degradó a fallback determinístico', error)
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
        'Eres un analista de conciliación. Explica de forma clara y breve (2-3 frases) por qué '
        + 'la factura recibió este estado, basándote EXCLUSIVAMENTE en la evidencia y la decisión '
        + 'ya tomada. No inventes datos ni cambies la decisión. Escribe en español.',
      maxTokens: 220
    })
    return text.trim() || result.explanation
  } catch (error) {
    console.error('[ai] enrichExplanation degradó a la plantilla determinística', error)
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
    .map(signal => `- ${signal.label}: ${signal.matched ? 'coincide' : 'no coincide'}${signal.detail ? ` (${signal.detail})` : ''}`)
    .join('\n')

  const matchedPayments = payments
    .filter(payment => result.matchedPaymentIds.includes(payment.id))
    .map(payment => `${payment.id} · ${payment.amount} ${payment.currency} · ref ${payment.reference ?? 'sin referencia'}`)
    .join('; ') || 'ninguno'

  const relatedNotes = notes.length > 0
    ? notes.map(note => `(${note.source}) ${note.text}`).join(' | ')
    : 'ninguna'

  return [
    `Factura: ${invoice.id} — ${invoice.vendor} — ${invoice.amount} ${invoice.currency}`,
    `Estado decidido: ${result.status} (confianza ${(result.confidence * 100).toFixed(0)}%)`,
    `Saldo pendiente: ${result.remainingBalance ?? 'n/a'}`,
    `Acción sugerida: ${result.suggestedAction}`,
    `Pagos vinculados: ${matchedPayments}`,
    `Notas relacionadas: ${relatedNotes}`,
    'Señales de evidencia:',
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
