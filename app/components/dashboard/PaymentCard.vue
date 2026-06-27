<script setup lang="ts">
import type { Payment } from '~~/shared/types/domain'

defineProps<{
  payment: Payment
}>()
</script>

<template>
  <article class="flex flex-col gap-4 h-full p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-highlighted truncate">
          {{ payment.id }}
        </p>
        <p class="text-xs text-muted truncate">
          {{ payment.payerName }}
        </p>
      </div>
      <UBadge
        :label="payment.currency"
        color="secondary"
        variant="soft"
        size="sm"
        class="shrink-0"
      />
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
