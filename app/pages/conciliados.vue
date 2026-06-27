<script setup lang="ts">
import type { Invoice, ReconciliationResult } from '~~/shared/types/domain'

definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Conciliados' })

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
</script>

<template>
  <UDashboardPanel id="conciliados">
    <template #header>
      <UDashboardNavbar title="Conciliados" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            label="Re-ejecutar"
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
          Cada decisión es determinística, explicable y auditable.
          La IA solo redacta la explicación; nunca decide la conciliación.
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
                  {{ invoice?.vendor ?? 'Proveedor desconocido' }}
                </p>
              </div>
              <p v-if="invoice" class="text-lg font-semibold tracking-tight text-highlighted tabular-nums">
                {{ formatCurrency(invoice.amount, invoice.currency) }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <UBadge
                :label="`${(result.confidence * 100).toFixed(0)}% confianza`"
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
                Siguiente acción: {{ result.suggestedAction }}
              </p>
            </div>
          </div>

          <div v-if="result.status !== 'Matched'" class="flex items-center gap-2">
            <UButton
              label="Aceptar"
              color="primary"
              size="sm"
              icon="i-lucide-check"
              :loading="reviewingId === result.invoiceId"
              :disabled="reviewingId !== null"
              @click="review(result.invoiceId, { action: 'accept' })"
            />
            <UButton
              label="Corregir"
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
          title="Corregir conciliación"
          :description="`Devuelve ${correctTarget} a revisión manual y registra el motivo en la auditoría.`"
          :ui="{ content: 'max-w-xl' }"
        >
          <template #body>
            <UFormField label="Motivo de la corrección" name="comment" required>
              <UTextarea
                v-model="correctComment"
                :rows="4"
                autoresize
                placeholder="Ej. La moneda del pago no coincide con la factura; requiere validación manual."
                class="w-full"
              />
            </UFormField>
          </template>

          <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
              <UButton label="Cancelar" color="neutral" variant="ghost" @click="correctOpen = false" />
              <UButton
                label="Enviar a revisión"
                icon="i-lucide-pencil"
                color="primary"
                :loading="reviewingId === correctTarget"
                :disabled="!correctComment.trim()"
                @click="submitCorrect()"
              />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
