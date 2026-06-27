export type PoolResource = 'invoices' | 'payments' | 'notes'

export type ImportFormat = 'csv' | 'json'

interface SampleFile {
  /** Nombre del archivo de ejemplo descargable. */
  filename: string
  /** Contenido de ejemplo (cabecera/array + filas guía). */
  content: string
}

interface PoolMeta {
  /** Etiqueta singular del documento ("factura", "pago", "nota"). */
  singular: string
  /** Etiqueta plural usada en títulos. */
  plural: string
  icon: string
  /** Endpoint de importación (acepta CSV o JSON). */
  importEndpoint: string
  /** Ejemplos descargables por formato. */
  samples: Record<ImportFormat, SampleFile>
  /** Columnas/campos esperados, para guiar al usuario. */
  columns: string[]
  /** Claves de useFetch a refrescar tras una mutación. */
  refreshKeys: string[]
}

const RECONCILIATION_KEYS = ['reconciliation-summary', 'reconciliation-results']

export const POOL_META: Record<PoolResource, PoolMeta> = {
  invoices: {
    singular: 'factura',
    plural: 'Facturas',
    icon: 'i-lucide-file-text',
    importEndpoint: '/api/import/invoices',
    samples: {
      csv: {
        filename: 'facturas-ejemplo.csv',
        content: [
          'invoice_id,vendor,invoice_date,due_date,currency,amount,po_number,status',
          'INV-2001,ACME Logistics,2026-06-01,2026-06-30,USD,1250.00,PO-9001,open',
          'INV-2002,Grupo Norte SA,2026-06-03,2026-07-03,MXN,18500.00,PO-9002,open'
        ].join('\n')
      },
      json: {
        filename: 'facturas-ejemplo.json',
        content: JSON.stringify([
          { id: 'INV-2001', vendor: 'ACME Logistics', invoiceDate: '2026-06-01', dueDate: '2026-06-30', currency: 'USD', amount: 1250.00, poNumber: 'PO-9001', status: 'open' },
          { id: 'INV-2002', vendor: 'Grupo Norte SA', invoiceDate: '2026-06-03', dueDate: '2026-07-03', currency: 'MXN', amount: 18500.00, poNumber: 'PO-9002', status: 'open' }
        ], null, 2)
      }
    },
    columns: ['invoice_id', 'vendor', 'invoice_date', 'due_date', 'currency', 'amount', 'po_number', 'status'],
    refreshKeys: ['pool-invoices', ...RECONCILIATION_KEYS]
  },
  payments: {
    singular: 'pago',
    plural: 'Pagos',
    icon: 'i-lucide-banknote',
    importEndpoint: '/api/import/payments',
    samples: {
      csv: {
        filename: 'pagos-ejemplo.csv',
        content: [
          'payment_id,payment_date,payer_name,currency,amount,reference',
          'PAY-2001,2026-06-05,ACME Logistics,USD,1250.00,Payment for INV-2001',
          'PAY-2002,2026-06-07,Grupo Norte,MXN,18500.00,INV-2002'
        ].join('\n')
      },
      json: {
        filename: 'pagos-ejemplo.json',
        content: JSON.stringify([
          { id: 'PAY-2001', paymentDate: '2026-06-05', payerName: 'ACME Logistics', currency: 'USD', amount: 1250.00, reference: 'Payment for INV-2001' },
          { id: 'PAY-2002', paymentDate: '2026-06-07', payerName: 'Grupo Norte', currency: 'MXN', amount: 18500.00, reference: 'INV-2002' }
        ], null, 2)
      }
    },
    columns: ['payment_id', 'payment_date', 'payer_name', 'currency', 'amount', 'reference'],
    refreshKeys: ['pool-payments', ...RECONCILIATION_KEYS]
  },
  notes: {
    singular: 'nota',
    plural: 'Notas',
    icon: 'i-lucide-sticky-note',
    importEndpoint: '/api/import/notes',
    samples: {
      csv: {
        filename: 'notas-ejemplo.csv',
        content: [
          'source,text',
          'email,ACME Logistics confirmó el pago de la factura INV-2001.',
          'slack,Grupo Norte aplicará un descuento por pronto pago en INV-2002.'
        ].join('\n')
      },
      json: {
        filename: 'notas-ejemplo.json',
        content: JSON.stringify([
          { source: 'email', text: 'ACME Logistics confirmó el pago de la factura INV-2001.' },
          { source: 'slack', text: 'Grupo Norte aplicará un descuento por pronto pago en INV-2002.' }
        ], null, 2)
      }
    },
    columns: ['source', 'text'],
    refreshKeys: ['pool-notes', ...RECONCILIATION_KEYS]
  }
}

/**
 * Extrae un mensaje legible de un error de `$fetch` (FetchError de Nitro).
 */
export function extractErrorMessage(error: unknown, fallback = 'Inténtalo de nuevo.'): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { statusMessage?: string, message?: string } }).data
    if (data?.statusMessage) return data.statusMessage
    if (data?.message) return data.message
    const message = (error as { statusMessage?: string, message?: string }).statusMessage
      ?? (error as { message?: string }).message
    if (message) return message
  }
  return fallback
}

/**
 * Dispara la descarga de un archivo de texto en el navegador.
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
