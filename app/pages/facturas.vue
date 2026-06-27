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
        <p class="text-sm text-muted">
          Pool de facturas normalizadas. {{ invoices.length }} documentos.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardInvoiceCard
            v-for="invoice in invoices"
            :key="invoice.id"
            :invoice="invoice"
            :status="statusByInvoice.get(invoice.id)"
          />
        </div>

        <USkeleton v-if="pending && invoices.length === 0" class="h-40 rounded-md" />
      </div>
    </template>
  </UDashboardPanel>
</template>
