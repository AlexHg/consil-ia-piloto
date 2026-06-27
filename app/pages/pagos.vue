<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Pagos' })

const { payments } = usePools()
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
        <p class="text-sm text-muted">
          Pool de pagos normalizados. {{ payments.length }} movimientos.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardPaymentCard
            v-for="payment in payments"
            :key="payment.id"
            :payment="payment"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
