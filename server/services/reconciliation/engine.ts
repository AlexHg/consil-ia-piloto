import type {
  Invoice,
  Payment,
  OperationalNote,
  EvidenceSignal,
  ReconciliationResult,
  ReconciliationStatus
} from '~~/shared/types/domain'

/**
 * Motor de conciliación determinístico (versión inicial).
 *
 * Aplica reglas explicables sobre la evidencia disponible y produce, por cada
 * factura, un resultado auditable: estado, confianza, señales utilizadas,
 * explicación y siguiente acción.
 *
 * La IA NO participa aquí: este motor es 100% determinístico. La IA solo
 * enriquece la información (OCR, normalización, redacción de explicaciones)
 * en capas externas. La búsqueda vectorial (pgvector) recuperará candidatos
 * en el futuro; hoy se recuperan por referencia/monto/proveedor.
 */

const AMOUNT_TOLERANCE = 0.01

function normalizeVendor(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(llc|sa|inc|ltd|co|corp|operations|ops|services|service)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

function vendorSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeVendor(a).split(' ').filter(Boolean))
  const tokensB = new Set(normalizeVendor(b).split(' ').filter(Boolean))
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  let shared = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) shared++
  }
  return shared / Math.max(tokensA.size, tokensB.size)
}

function referenceMatches(invoice: Invoice, payment: Payment): boolean {
  const reference = (payment.reference ?? '').toLowerCase()
  if (!reference) return false

  const invoiceDigits = digits(invoice.id)
  const poDigits = invoice.poNumber ? digits(invoice.poNumber) : ''

  if (invoiceDigits && digits(reference).includes(invoiceDigits)) return true
  if (poDigits && digits(reference).includes(poDigits)) return true
  if (invoice.id && reference.includes(invoice.id.toLowerCase())) return true
  if (invoice.poNumber && reference.includes(invoice.poNumber.toLowerCase())) return true
  return false
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function reconcileInvoice(
  invoice: Invoice,
  payments: Payment[],
  notes: OperationalNote[]
): ReconciliationResult {
  const byReference = payments.filter(payment => referenceMatches(invoice, payment))

  const candidates = byReference.length > 0
    ? byReference
    : payments.filter(payment => Math.abs(payment.amount - invoice.amount) <= AMOUNT_TOLERANCE
      && vendorSimilarity(invoice.vendor, payment.payerName) >= 0.5)

  const matchedPaymentIds = candidates.map(payment => payment.id)
  const paidAmount = candidates.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingBalance = Number((invoice.amount - paidAmount).toFixed(2))

  const hasReference = byReference.length > 0
  const amountExact = candidates.length > 0 && Math.abs(paidAmount - invoice.amount) <= AMOUNT_TOLERANCE
  const amountPartial = candidates.length > 0 && paidAmount < invoice.amount - AMOUNT_TOLERANCE
  const currencyMatch = candidates.length > 0 && candidates.every(p => p.currency === invoice.currency)
  const bestVendorSimilarity = candidates.reduce(
    (max, p) => Math.max(max, vendorSimilarity(invoice.vendor, p.payerName)),
    0
  )
  const duplicateSuspected = candidates.length > 1 && amountExact === false && paidAmount > invoice.amount

  const relatedNotes = notes.filter((note) => {
    const text = note.text.toLowerCase()
    return text.includes(invoice.id.toLowerCase())
      || (invoice.poNumber ? text.includes(invoice.poNumber.toLowerCase()) : false)
      || vendorSimilarity(invoice.vendor, note.text) >= 0.4
  })

  const signals: EvidenceSignal[] = [
    {
      key: 'reference',
      label: 'Matching reference',
      weight: 0.45,
      matched: hasReference,
      detail: hasReference ? candidates.map(p => p.reference).filter(Boolean).join(' · ') : undefined
    },
    {
      key: 'amount',
      label: amountExact ? 'Exact amount' : amountPartial ? 'Partial amount' : 'Amount',
      weight: amountExact ? 0.3 : amountPartial ? 0.12 : 0,
      matched: amountExact || amountPartial,
      detail: candidates.length > 0 ? `Paid ${paidAmount} of ${invoice.amount} ${invoice.currency}` : undefined
    },
    {
      key: 'currency',
      label: 'Matching currency',
      weight: 0.1,
      matched: currencyMatch,
      detail: candidates.length > 0 && !currencyMatch ? 'Currency differs from invoice' : undefined
    },
    {
      key: 'vendor',
      label: 'Similar vendor',
      weight: 0.15,
      matched: bestVendorSimilarity >= 0.5,
      detail: bestVendorSimilarity > 0 ? `${(bestVendorSimilarity * 100).toFixed(0)}% similarity` : undefined
    }
  ]

  let confidence = signals.reduce((sum, signal) => sum + (signal.matched ? signal.weight : 0), 0)
  confidence = clamp(confidence, 0, 0.99)

  let status: ReconciliationStatus
  let suggestedAction: string

  if (candidates.length === 0) {
    status = 'Unmatched'
    suggestedAction = 'Find an associated payment or record the reason for the difference.'
  } else if (candidates.length > 0 && !currencyMatch) {
    status = 'Suspicious'
    suggestedAction = 'Review manually: payment currency does not match the invoice.'
  } else if (duplicateSuspected) {
    status = 'Suspicious'
    suggestedAction = 'Possible duplicate payment. Verify before closing.'
  } else if (amountExact && confidence >= 0.9) {
    status = 'Matched'
    suggestedAction = 'Reconciliation ready for approval.'
  } else if (amountPartial) {
    status = 'Partial Match'
    suggestedAction = `Partial payment. Remaining balance: ${remainingBalance} ${invoice.currency}.`
  } else {
    status = 'Needs Review'
    suggestedAction = 'Manually confirm the suggested match.'
  }

  const explanationParts: string[] = []
  if (hasReference) explanationParts.push('matching reference')
  if (amountExact) explanationParts.push('same amount')
  else if (amountPartial) explanationParts.push('partial amount')
  if (bestVendorSimilarity >= 0.5) explanationParts.push('similar vendor')
  if (!currencyMatch && candidates.length > 0) explanationParts.push('different currency')
  if (relatedNotes.length > 0) explanationParts.push('related operational notes')

  const explanation = candidates.length === 0
    ? 'No payment evidence was found for this invoice.'
    : `Determined by: ${explanationParts.join(', ')}.`

  return {
    invoiceId: invoice.id,
    matchedPaymentIds,
    status,
    confidence: Number(confidence.toFixed(4)),
    remainingBalance: candidates.length === 0 ? null : remainingBalance,
    suggestedAction,
    explanation,
    signals
  }
}

export function reconcileAll(
  invoices: Invoice[],
  payments: Payment[],
  notes: OperationalNote[]
): ReconciliationResult[] {
  return invoices.map(invoice => reconcileInvoice(invoice, payments, notes))
}
