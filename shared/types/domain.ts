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
  /**
   * Identificador de la fila en la tabla `notes`. El dominio puro no lo necesita
   * para conciliar, pero la UI sí lo usa para direccionar la nota (detalle,
   * borrado) y el enriquecimiento para actualizarla. Opcional: al crear una nota
   * todavía no existe.
   */
  id?: string;
  source: string;
  text: string;
  /** Resumen generado por la IA al interpretar la nota (null si aún no se interpretó). */
  interpretedSummary?: string | null;
  /** IDs de facturas/pagos que la IA detectó referenciados en el texto. */
  referencedIds?: string[] | null;
}

/**
 * Estados posibles que produce el motor determinístico de conciliación.
 */
export type ReconciliationStatus =
  | "Matched"
  | "Partial Match"
  | "Needs Review"
  | "Unmatched"
  | "Suspicious";

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
 * Decisión humana sobre una conciliación (revisión).
 *
 * El motor decide de forma determinística; el revisor solo confirma (`accept`)
 * o devuelve a revisión manual (`correct`). Cada decisión se registra en el
 * audit trail (`reconciliation_reviews`) — la IA nunca decide.
 */
export type ReviewAction = 'accept' | 'correct'

/** Payload que envía la UI al revisar una conciliación. */
export interface ReconciliationReviewInput {
  action: ReviewAction
  comment?: string
}

/** Resultado de aplicar una revisión: incluye el cambio de estado auditado. */
export interface ReconciliationReviewResult {
  reconciliationId: string
  invoiceId: string
  action: ReviewAction
  previousStatus: ReconciliationStatus
  newStatus: ReconciliationStatus
}

/**
 * Entrada del audit trail (`reconciliation_reviews`): una decisión humana
 * registrada de forma append-only. La UI la consulta para mostrar el historial
 * de revisiones de una factura.
 */
export interface ReconciliationReviewLogEntry {
  id: string
  invoiceId: string
  action: ReviewAction
  actor: string
  previousStatus: ReconciliationStatus | null
  newStatus: ReconciliationStatus | null
  comment: string | null
  createdAt: string
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
