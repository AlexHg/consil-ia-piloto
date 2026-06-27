<script setup lang="ts">
import type { Payment, ReconciliationStatus } from '~~/shared/types/domain'

defineProps<{
  payment: Payment
  status?: ReconciliationStatus
}>()
</script>

<template>
  <article class="group flex flex-col gap-4 h-full p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-highlighted truncate">
          {{ payment.id }}
        </p>
        <p class="text-xs text-muted truncate">
          {{ payment.payerName }}
        </p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <UBadge
          v-if="status"
          :label="paymentStatusLabel(status)"
          :color="paymentStatusColor(status)"
          variant="soft"
          size="sm"
        />
        <UBadge
          :label="payment.currency"
          color="secondary"
          variant="soft"
          size="sm"
        />
        <div class="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <PoolDeleteButton resource="payments" :id="payment.id" :label="payment.id" />
        </div>
      </div>
    </div>

    <p class="text-2xl font-semibold tracking-tight text-highlighted tabular-nums">
      {{ formatCurrency(payment.amount, payment.currency) }}
    </p>

    <div class="mt-auto flex flex-col gap-1.5 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5">
        <UIcon name="i-lucide-calendar" class="size-3.5 shrink-0" />
        {{ formatDate(payment.paymentDate) }}
      </span>
      <span v-if="payment.reference" class="inline-flex items-center gap-1.5 min-w-0">
        <UIcon name="i-lucide-link" class="size-3.5 shrink-0" />
        <span class="truncate">{{ payment.reference }}</span>
      </span>
    </div>
  </article>
</template>
