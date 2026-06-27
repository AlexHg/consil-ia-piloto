<script setup lang="ts">
import type { Invoice, ReconciliationStatus } from '~~/shared/types/domain'

defineProps<{
  invoice: Invoice
  status?: ReconciliationStatus
}>()
</script>

<template>
  <article class="flex flex-col gap-4 h-full p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-highlighted truncate">
          {{ invoice.id }}
        </p>
        <p class="text-xs text-muted truncate">
          {{ invoice.vendor }}
        </p>
      </div>
      <UBadge
        v-if="status"
        :label="reconciliationLabel(status)"
        :color="reconciliationColor(status)"
        variant="soft"
        size="sm"
        class="shrink-0"
      />
    </div>

    <p class="text-2xl font-semibold tracking-tight text-highlighted tabular-nums">
      {{ formatCurrency(invoice.amount, invoice.currency) }}
    </p>

    <div class="mt-auto flex items-center justify-between text-xs text-muted">
      <span class="inline-flex items-center gap-1.5">
        <UIcon name="i-lucide-calendar" class="size-3.5" />
        Vence {{ formatDate(invoice.dueDate) }}
      </span>
      <span v-if="invoice.poNumber" class="inline-flex items-center gap-1.5">
        <UIcon name="i-lucide-hash" class="size-3.5" />
        {{ invoice.poNumber }}
      </span>
    </div>
  </article>
</template>
