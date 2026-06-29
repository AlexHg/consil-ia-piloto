<script setup lang="ts">
import type { ReconciliationResult, ReconciliationStatus } from '~~/shared/types/domain'

definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Dashboard' })

const { invoices, payments, notes, summary, pending } = usePools()

const { paymentStatus } = usePaymentStatuses()

const { run: runReconciliation, running: reconciling } = useReconciliation()

const { data: results } = useFetch<ReconciliationResult[]>('/api/reconciliation', {
  key: 'reconciliation-results',
  default: () => []
})

const statusByInvoice = computed(() => {
  const map = new Map<string, ReconciliationStatus>()
  for (const result of results.value) {
    map.set(result.invoiceId, result.status)
  }
  return map
})

// El dashboard muestra solo un avance de cada pool; el detalle completo vive en
// las páginas dedicadas (View all).
const DASHBOARD_POOL_LIMIT = 15

// El dashboard prioriza siempre por estado: Revisión primero, Conciliado
// después y Sospechoso al final (ver reconciliationRank).
const sortedInvoices = computed(() =>
  [...invoices.value].sort((a, b) =>
    reconciliationRank(statusByInvoice.value.get(a.id)) - reconciliationRank(statusByInvoice.value.get(b.id))
  ).slice(0, DASHBOARD_POOL_LIMIT)
)

const previewPayments = computed(() => payments.value.slice(0, DASHBOARD_POOL_LIMIT))

const previewNotes = computed(() => notes.value.slice(0, DASHBOARD_POOL_LIMIT))

const totalInvoiceAmount = computed(() =>
  invoices.value.reduce((sum, invoice) => sum + invoice.amount, 0)
)

const totalDocuments = computed(() =>
  invoices.value.length + payments.value.length + notes.value.length
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 19) return 'Good afternoon'
  return 'Good evening'
})

const breakdown = computed(() => {
  const s = summary.value
  return [
    { key: 'matched', label: 'Matched', value: s.matched, color: 'bg-success' },
    { key: 'partial', label: 'Partial', value: s.partial, color: 'bg-warning' },
    { key: 'needsReview', label: 'Review', value: s.needsReview, color: 'bg-amber-300' },
    { key: 'suspicious', label: 'Suspicious', value: s.suspicious, color: 'bg-error' },
    { key: 'unmatched', label: 'Unmatched', value: s.unmatched, color: 'bg-muted' }
  ].filter(segment => segment.value > 0)
})
</script>

<template>
  <UDashboardPanel id="dashboard-home">
    <template #header>
      <UDashboardNavbar title="Dashboard" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton icon="i-lucide-play" label="Run reconciliation" color="primary" size="sm"
            class="hidden sm:inline-flex" :loading="reconciling" @click="runReconciliation" />
          <UButton icon="i-lucide-play" color="primary" size="sm" class="sm:hidden"
            aria-label="Run reconciliation" :loading="reconciling" @click="runReconciliation" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-8 pb-4">
        <!-- Encabezado ejecutivo -->
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ greeting }}, Administrator
          </h1>
          <p class="text-sm text-muted">
            AI enriches and the deterministic engine reconciles.
            Today <span class="font-medium text-success">{{ summary.autoMatchRate }}%</span>
            was reconciled automatically.
          </p>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardStatCard label="Auto reconciliation" :value="`${summary.autoMatchRate}%`" icon="i-lucide-bot"
            color="primary" caption="Processed by the AI engine" :loading="pending" />
          <DashboardStatCard label="Reconciled" :value="formatNumber(summary.matched)" icon="i-lucide-circle-check"
            color="success" :caption="`of ${summary.total} invoices`" :loading="pending" />
          <DashboardStatCard label="Pending" :value="formatNumber(summary.pending)" icon="i-lucide-clock"
            color="warning" caption="Require manual review" :loading="pending" />
          <DashboardStatCard label="Total documents" :value="formatNumber(totalDocuments)" icon="i-lucide-layers"
            color="neutral" caption="Across all three knowledge pools" :loading="pending" />
        </div>

        <!-- Estado de conciliación (Conciliados) -->
        <section class="flex flex-col gap-5 p-6 rounded-md bg-default ring-1 ring-default shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center size-10 rounded-md bg-success/10 text-success ring-1 ring-success/15">
                <UIcon name="i-lucide-link-2" class="size-5" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-highlighted">
                  Reconciliation status
                </h2>
                <p class="text-xs text-muted">
                  Deterministic and auditable outcome
                </p>
              </div>
            </div>
            <UButton to="/conciliados" label="View reconciled" color="neutral" variant="ghost" size="sm"
              trailing-icon="i-lucide-arrow-right" />
          </div>

          <div class="flex h-3 w-full overflow-hidden rounded-full bg-elevated">
            <div v-for="segment in breakdown" :key="segment.key"
              class="h-full first:rounded-s-full last:rounded-e-full transition-all" :class="segment.color"
              :style="{ width: `${(segment.value / (summary.total || 1)) * 100}%` }" />
          </div>

          <div class="flex flex-wrap gap-x-6 gap-y-2">
            <div v-for="segment in breakdown" :key="segment.key" class="flex items-center gap-2 text-sm">
              <span class="size-2.5 rounded-full" :class="segment.color" />
              <span class="text-muted">{{ segment.label }}</span>
              <span class="font-medium text-highlighted tabular-nums">{{ segment.value }}</span>
            </div>
          </div>
        </section>

        <!-- Carruseles de los tres inputs -->
        <DashboardPoolSection title="Invoice Pool" subtitle="Normalized sales documents"
          icon="i-lucide-file-text" color="primary" to="/facturas" :items="sortedInvoices" :loading="pending">
          <template #default="{ item }">
            <DashboardInvoiceCard :invoice="item" :status="statusByInvoice.get(item.id)" />
          </template>
        </DashboardPoolSection>

        <DashboardPoolSection title="Payment Pool" subtitle="Incoming payments awaiting reconciliation"
          icon="i-lucide-banknote" color="secondary" to="/pagos" :items="previewPayments" :loading="pending">
          <template #default="{ item }">
            <DashboardPaymentCard :payment="item" :status="paymentStatus(item.id)" />
          </template>
        </DashboardPoolSection>

        <DashboardPoolSection title="Notes Pool" subtitle="Operational context interpreted by AI"
          icon="i-lucide-sticky-note" color="warning" to="/notas" :items="previewNotes" :loading="pending"
          empty-label="No operational notes recorded yet.">
          <template #default="{ item }">
            <DashboardNoteCard :note="item" />
          </template>
        </DashboardPoolSection>

        <p class="mt-2 text-center text-xs text-dimmed">
          Total invoiced in pool: {{ formatCurrency(totalInvoiceAmount) }}
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
