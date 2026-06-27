import type { ReconciliationStatus } from '~~/shared/types/domain'

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value)
}

export function formatDate(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

type UiColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export function reconciliationColor(status: ReconciliationStatus): UiColor {
  switch (status) {
    case 'Matched':
      return 'success'
    case 'Partial Match':
    case 'Needs Review':
      return 'warning'
    case 'Suspicious':
      return 'error'
    case 'Unmatched':
    default:
      return 'neutral'
  }
}

export function reconciliationLabel(status: ReconciliationStatus): string {
  switch (status) {
    case 'Matched':
      return 'Conciliado'
    case 'Partial Match':
      return 'Parcial'
    case 'Needs Review':
      return 'Revisión'
    case 'Suspicious':
      return 'Sospechoso'
    case 'Unmatched':
    default:
      return 'Sin conciliar'
  }
}

const NOTE_SOURCE_META: Record<string, { label: string, icon: string }> = {
  email: { label: 'Email', icon: 'i-lucide-mail' },
  slack: { label: 'Slack', icon: 'i-lucide-message-square' },
  'ops-note': { label: 'Operaciones', icon: 'i-lucide-clipboard-list' }
}

export function noteSourceMeta(source: string): { label: string, icon: string } {
  return NOTE_SOURCE_META[source] ?? { label: source, icon: 'i-lucide-sticky-note' }
}
