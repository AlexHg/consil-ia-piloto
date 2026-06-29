<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { POOL_META, type PoolResource } from '~/utils/pools'

const props = defineProps<{
  resource: PoolResource
}>()

const createOpen = ref(false)
const importOpen = ref(false)
const exportOpen = ref(false)

const { invoices, payments, notes } = usePools()

const createLabel = computed(() => {
  switch (props.resource) {
    case 'invoices':
      return 'New invoice'
    case 'payments':
      return 'New payment'
    case 'notes':
      return 'New note'
  }
  return 'Create'
})

/** Registros del pool activo, usados tanto para JSON como para CSV. */
const exportRows = computed<Record<string, unknown>[]>(() => {
  switch (props.resource) {
    case 'invoices':
      return invoices.value as unknown as Record<string, unknown>[]
    case 'payments':
      return payments.value as unknown as Record<string, unknown>[]
    case 'notes':
      return notes.value as unknown as Record<string, unknown>[]
  }
  return []
})

const exportFilename = computed(() => POOL_META[props.resource].plural.toLowerCase())

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: createLabel.value,
    icon: 'i-lucide-square-pen',
    onSelect: () => { createOpen.value = true }
  },
  {
    label: 'Import',
    icon: 'i-lucide-upload',
    onSelect: () => { importOpen.value = true }
  },
  {
    label: 'Export',
    icon: 'i-lucide-download',
    onSelect: () => { exportOpen.value = true }
  }
])
</script>

<template>
  <div>
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end' }"
      :ui="{ content: 'w-52', group: 'p-2', item: 'px-3 py-2.5 gap-2.5' }"
    >
      <UButton
        icon="i-lucide-plus"
        label="Add"
        trailing-icon="i-lucide-chevron-down"
        color="primary"
        size="sm"
      />
    </UDropdownMenu>

    <PoolInvoiceForm v-if="resource === 'invoices'" v-model:open="createOpen" />
    <PoolPaymentForm v-else-if="resource === 'payments'" v-model:open="createOpen" />
    <PoolNoteForm v-else-if="resource === 'notes'" v-model:open="createOpen" />

    <PoolImportModal :resource="resource" v-model:open="importOpen" />

    <PoolExportModal
      v-model:open="exportOpen"
      :title="`Export ${POOL_META[resource].plural.toLowerCase()}`"
      description="Download the current pool as a JSON or CSV file."
      :filename="exportFilename"
      :json-data="exportRows"
      :csv-rows="exportRows"
    />
  </div>
</template>
