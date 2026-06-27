<script setup lang="ts">
import type { ReconciliationResult, ReconciliationStatus } from '~~/shared/types/domain'

definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Facturas' })

const { invoices, pending } = usePools()

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

const {
  sortKey,
  direction,
  sorted: sortedInvoices,
  selectItems: sortOptions
} = usePoolSort(invoices, [
  {
    value: 'status',
    label: 'Por estado',
    icon: 'i-lucide-flag',
    compare: (a, b) =>
      reconciliationRank(statusByInvoice.value.get(a.id)) - reconciliationRank(statusByInvoice.value.get(b.id))
  },
  {
    value: 'date',
    label: 'Por fecha',
    icon: 'i-lucide-calendar',
    compare: (a, b) => dateValue(a.dueDate) - dateValue(b.dueDate)
  },
  {
    value: 'amount',
    label: 'Por monto',
    icon: 'i-lucide-banknote',
    compare: (a, b) => a.amount - b.amount
  }
])

const { page, pageSize, total, rangeStart, rangeEnd, paginated } = usePagination(sortedInvoices)
</script>

<template>
  <UDashboardPanel id="facturas">
    <template #header>
      <UDashboardNavbar title="Facturas" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <PoolActions resource="invoices" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Pool de facturas normalizadas. {{ invoices.length }} documentos.
          </p>
          <PoolSortControls
            v-model:sort-key="sortKey"
            v-model:direction="direction"
            :options="sortOptions"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardInvoiceCard
            v-for="invoice in paginated"
            :key="invoice.id"
            :invoice="invoice"
            :status="statusByInvoice.get(invoice.id)"
          />
        </div>

        <PoolPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :range-start="rangeStart"
          :range-end="rangeEnd"
        />

        <USkeleton v-if="pending && invoices.length === 0" class="h-40 rounded-md" />
      </div>
    </template>
  </UDashboardPanel>
</template>
