<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Pagos' })

const { payments } = usePools()
const { paymentStatus } = usePaymentStatuses()

const {
  sortKey,
  direction,
  sorted: sortedPayments,
  selectItems: sortOptions
} = usePoolSort(payments, [
  {
    value: 'date',
    label: 'Por fecha',
    icon: 'i-lucide-calendar',
    compare: (a, b) => dateValue(a.paymentDate) - dateValue(b.paymentDate)
  },
  {
    value: 'amount',
    label: 'Por monto',
    icon: 'i-lucide-banknote',
    compare: (a, b) => a.amount - b.amount
  },
  {
    value: 'status',
    label: 'Por estado',
    icon: 'i-lucide-link-2',
    compare: (a, b) => paymentStatusRank(paymentStatus(a.id)) - paymentStatusRank(paymentStatus(b.id))
  }
], { key: 'date', direction: 'desc' })

const { page, pageSize, total, rangeStart, rangeEnd, paginated } = usePagination(sortedPayments)
</script>

<template>
  <UDashboardPanel id="pagos">
    <template #header>
      <UDashboardNavbar title="Pagos" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <PoolActions resource="payments" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Pool de pagos normalizados. {{ payments.length }} movimientos.
          </p>
          <PoolSortControls
            v-model:sort-key="sortKey"
            v-model:direction="direction"
            :options="sortOptions"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardPaymentCard
            v-for="payment in paginated"
            :key="payment.id"
            :payment="payment"
            :status="paymentStatus(payment.id)"
          />
        </div>

        <PoolPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :range-start="rangeStart"
          :range-end="rangeEnd"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
