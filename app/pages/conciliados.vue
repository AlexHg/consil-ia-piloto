<script setup lang="ts">
import type { Invoice, ReconciliationResult } from '~~/shared/types/domain'

definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Reconciled' })

const { invoices } = usePools()
const { run, running, review, reviewingId } = useReconciliation()

const { data: results, pending } = useFetch<ReconciliationResult[]>('/api/reconciliation', {
  key: 'reconciliation-results',
  default: () => []
})

const correctOpen = ref(false)
const correctTarget = ref<string | null>(null)
const correctComment = ref('')

function openCorrect(invoiceId: string) {
  correctTarget.value = invoiceId
  correctComment.value = ''
  correctOpen.value = true
}

async function submitCorrect() {
  if (!correctTarget.value || !correctComment.value.trim()) return
  const ok = await review(correctTarget.value, {
    action: 'correct',
    comment: correctComment.value
  })
  if (ok) correctOpen.value = false
}

const invoiceById = computed(() => {
  const map = new Map<string, Invoice>()
  for (const invoice of invoices.value) {
    map.set(invoice.id, invoice)
  }
  return map
})

const rows = computed(() =>
  results.value.map(result => ({
    result,
    invoice: invoiceById.value.get(result.invoiceId)
  }))
)

const { page, pageSize, total, rangeStart, rangeEnd, paginated } = usePagination(rows)

const exportOpen = ref(false)

/** Filas planas para el CSV de conciliaciones (estructuras anidadas resumidas). */
const exportCsvRows = computed<Record<string, unknown>[]>(() =>
  results.value.map((result) => {
    const invoice = invoiceById.value.get(result.invoiceId)
    return {
      invoiceId: result.invoiceId,
      vendor: invoice?.vendor ?? '',
      amount: invoice?.amount ?? '',
      currency: invoice?.currency ?? '',
      status: result.status,
      confidence: result.confidence,
      remainingBalance: result.remainingBalance ?? '',
      matchedPaymentIds: result.matchedPaymentIds.join('; '),
      matchedSignals: result.signals.filter(s => s.matched).map(s => s.label).join('; '),
      suggestedAction: result.suggestedAction,
      explanation: result.explanation
    }
  })
)
</script>

<template>
  <UDashboardPanel id="conciliados">
    <template #header>
      <UDashboardNavbar title="Reconciled" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-download"
            label="Export"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="results.length === 0"
            @click="exportOpen = true"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            label="Re-run"
            color="primary"
            size="sm"
            :loading="running"
            @click="run()"
          />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          Every decision is deterministic, explainable, and auditable.
          AI only drafts the explanation; it never decides the reconciliation.
        </p>

        <USkeleton v-if="pending && rows.length === 0" class="h-40 rounded-md" />

        <article
          v-for="{ result, invoice } in paginated"
          :key="result.invoiceId"
          class="flex flex-col gap-4 p-5 rounded-md bg-default ring-1 ring-default shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-highlighted">
                  {{ result.invoiceId }}
                </p>
                <span class="text-xs text-muted">·</span>
                <p class="text-sm text-muted truncate">
                  {{ invoice?.vendor ?? 'Unknown vendor' }}
                </p>
              </div>
              <p v-if="invoice" class="text-lg font-semibold tracking-tight text-highlighted tabular-nums">
                {{ formatCurrency(invoice.amount, invoice.currency) }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UBadge
                :label="`${(result.confidence * 100).toFixed(0)}% confidence`"
                color="neutral"
                variant="soft"
                size="sm"
              />
              <UBadge
                :label="reconciliationLabel(result.status)"
                :color="reconciliationColor(result.status)"
                variant="subtle"
                size="sm"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="signal in result.signals.filter(s => s.matched)"
              :key="signal.key"
              :label="signal.label"
              color="primary"
              variant="soft"
              size="sm"
              leading-icon="i-lucide-check"
            />
            <span v-if="result.matchedPaymentIds.length" class="inline-flex items-center gap-1.5 text-xs text-muted">
              <UIcon name="i-lucide-link" class="size-3.5" />
              {{ result.matchedPaymentIds.join(', ') }}
            </span>
          </div>

          <div class="flex items-start gap-2.5 p-3 rounded-md bg-elevated/60">
            <UIcon name="i-lucide-sparkles" class="size-4 mt-0.5 text-primary shrink-0" />
            <div class="flex flex-col gap-1">
              <p class="text-sm text-default">
                {{ result.explanation }}
              </p>
              <p class="text-xs text-muted">
                Next action: {{ result.suggestedAction }}
              </p>
            </div>
          </div>

          <div v-if="result.status !== 'Matched'" class="flex items-center gap-2">
            <UButton
              label="Accept"
              color="primary"
              size="sm"
              icon="i-lucide-check"
              :loading="reviewingId === result.invoiceId"
              :disabled="reviewingId !== null"
              @click="review(result.invoiceId, { action: 'accept' })"
            />
            <UButton
              label="Correct"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-pencil"
              :disabled="reviewingId !== null"
              @click="openCorrect(result.invoiceId)"
            />
          </div>
        </article>

        <PoolPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :range-start="rangeStart"
          :range-end="rangeEnd"
        />

        <UModal
          v-model:open="correctOpen"
          title="Correct reconciliation"
          :description="`Returns ${correctTarget} to manual review and logs the reason in the audit trail.`"
          :ui="{ content: 'max-w-xl' }"
        >
          <template #body>
            <UFormField label="Reason for correction" name="comment" required>
              <UTextarea
                v-model="correctComment"
                :rows="4"
                autoresize
                placeholder="E.g. Payment currency does not match the invoice; requires manual validation."
                class="w-full"
              />
            </UFormField>
          </template>

          <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="correctOpen = false" />
              <UButton
                label="Send for review"
                icon="i-lucide-pencil"
                color="primary"
                :loading="reviewingId === correctTarget"
                :disabled="!correctComment.trim()"
                @click="submitCorrect()"
              />
            </div>
          </template>
        </UModal>

        <PoolExportModal
          v-model:open="exportOpen"
          title="Export reconciled items"
          description="Download the reconciliation results as a JSON or CSV file."
          filename="reconciled"
          :json-data="results"
          :csv-rows="exportCsvRows"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
