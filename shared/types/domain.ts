/**
 * Modelo interno del dominio.
 *
 * Toda fuente de ingesta (CSV, JSON, PDF, imagen, alta manual) debe normalizarse
 * a estas entidades. El motor de conciliación nunca conoce el origen de la información.
 */

export type Currency = 'USD' | 'MXN' | 'EUR' | string

export interface Invoice {
  id: string
  vendor: string
  invoiceDate: string
  dueDate: string
  currency: Currency
  amount: number
  poNumber: string | null
  status: string
}

export interface Payment {
  id: string
  paymentDate: string
  payerName: string
  currency: Currency
  amount: number
  reference: string | null
}

export interface OperationalNote {
  source: string
  text: string
}

/**
 * Estados posibles que produce el motor determinístico de conciliación.
 */
export type ReconciliationStatus =
  | 'Matched'
  | 'Partial Match'
  | 'Needs Review'
  | 'Unmatched'
  | 'Suspicious'

/**
 * Señal individual que aporta evidencia a una conciliación.
 * Cada señal es explicable y suma/resta al confidence score.
 */
export interface EvidenceSignal {
  key: string
  label: string
  weight: number
  matched: boolean
  detail?: string
}

/**
 * Resultado de conciliar una factura. Debe ser auditable y explicable.
 */
export interface ReconciliationResult {
  invoiceId: string
  matchedPaymentIds: string[]
  status: ReconciliationStatus
  confidence: number
  remainingBalance: number | null
  suggestedAction: string
  explanation: string
  signals: EvidenceSignal[]
}

/**
 * Estado de la ejecución más reciente del motor de conciliación.
 *
 * La conciliación se procesa de forma asíncrona (cola pg-boss), por lo que la UI
 * consulta este estado para saber cuándo terminó una corrida y refrescar.
 */
export interface ReconciliationRunStatus {
  runId: string | null
  trigger: string
  invoicesCount: number | null
  startedAt: string | null
  finishedAt: string | null
  running: boolean
}

/**
 * Resumen ejecutivo de conciliación para el dashboard (Mission Control).
 */
export interface ReconciliationSummary {
  total: number
  matched: number
  partial: number
  needsReview: number
  unmatched: number
  suspicious: number
  pending: number
  autoMatchRate: number
}
