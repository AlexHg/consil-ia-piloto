<script setup lang="ts">
import type { ReconciliationResult, ReconciliationStatus } from '~~/shared/types/domain'

definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Dashboard' })

const { invoices, payments, notes, summary, pending } = usePools()

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

const totalInvoiceAmount = computed(() =>
  invoices.value.reduce((sum, invoice) => sum + invoice.amount, 0)
)

const totalDocuments = computed(() =>
  invoices.value.length + payments.value.length + notes.value.length
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const breakdown = computed(() => {
  const s = summary.value
  return [
    { key: 'matched', label: 'Conciliado', value: s.matched, color: 'bg-success' },
    { key: 'partial', label: 'Parcial', value: s.partial, color: 'bg-warning' },
    { key: 'needsReview', label: 'Revisión', value: s.needsReview, color: 'bg-amber-300' },
    { key: 'suspicious', label: 'Sospechoso', value: s.suspicious, color: 'bg-error' },
    { key: 'unmatched', label: 'Sin conciliar', value: s.unmatched, color: 'bg-muted' }
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
          <UButton icon="i-lucide-play" label="Ejecutar conciliación" color="primary" size="sm"
            class="hidden sm:inline-flex" />
          <UButton icon="i-lucide-play" color="primary" size="sm" class="sm:hidden"
            aria-label="Ejecutar conciliación" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-8 pb-4">
        <!-- Encabezado ejecutivo -->
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ greeting }}, Administrador
          </h1>
          <p class="text-sm text-muted">
            La IA enriquece y el motor determinístico concilia.
            Hoy <span class="font-medium text-success">{{ summary.autoMatchRate }}%</span>
            se concilió automáticamente.
          </p>
        </div>

        <!-- KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardStatCard label="Conciliación automática" :value="`${summary.autoMatchRate}%`" icon="i-lucide-bot"
            color="primary" caption="Procesado por el motor de IA" :loading="pending" />
          <DashboardStatCard label="Conciliados" :value="formatNumber(summary.matched)" icon="i-lucide-circle-check"
            color="success" :caption="`de ${summary.total} facturas`" :loading="pending" />
          <DashboardStatCard label="Pendientes" :value="formatNumber(summary.pending)" icon="i-lucide-clock"
            color="warning" caption="Requieren revisión manual" :loading="pending" />
          <DashboardStatCard label="Documentos totales" :value="formatNumber(totalDocuments)" icon="i-lucide-layers"
            color="neutral" caption="En los tres pools de conocimiento" :loading="pending" />
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
                  Estado de conciliación
                </h2>
                <p class="text-xs text-muted">
                  Resultado determinístico y auditable
                </p>
              </div>
            </div>
            <UButton to="/conciliados" label="Ver conciliados" color="neutral" variant="ghost" size="sm"
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
        <DashboardPoolSection title="Pool de Facturas" subtitle="Documentos de venta normalizados"
          icon="i-lucide-file-text" color="primary" to="/facturas" :items="invoices" :loading="pending">
          <template #default="{ item }">
            <DashboardInvoiceCard :invoice="item" :status="statusByInvoice.get(item.id)" />
          </template>
        </DashboardPoolSection>

        <DashboardPoolSection title="Pool de Pagos" subtitle="Movimientos recibidos por conciliar"
          icon="i-lucide-banknote" color="secondary" to="/pagos" :items="payments" :loading="pending">
          <template #default="{ item }">
            <DashboardPaymentCard :payment="item" />
          </template>
        </DashboardPoolSection>

        <DashboardPoolSection title="Pool de Notas" subtitle="Contexto operativo interpretado por IA"
          icon="i-lucide-sticky-note" color="warning" to="/notas" :items="notes" :loading="pending"
          empty-label="Sin notas operativas registradas.">
          <template #default="{ item }">
            <DashboardNoteCard :note="item" />
          </template>
        </DashboardPoolSection>

        <p class="mt-2 text-center text-xs text-dimmed">
          Total facturado en el pool: {{ formatCurrency(totalInvoiceAmount) }}
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
