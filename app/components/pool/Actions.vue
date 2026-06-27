<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { PoolResource } from '~/utils/pools'

const props = defineProps<{
  resource: PoolResource
}>()

const createOpen = ref(false)
const importOpen = ref(false)

const createLabel = computed(() => {
  switch (props.resource) {
    case 'invoices':
      return 'Nueva factura'
    case 'payments':
      return 'Nuevo pago'
    case 'notes':
      return 'Nueva nota'
  }
  return 'Crear'
})

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: createLabel.value,
    icon: 'i-lucide-square-pen',
    onSelect: () => { createOpen.value = true }
  },
  {
    label: 'Importación',
    icon: 'i-lucide-upload',
    onSelect: () => { importOpen.value = true }
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
        label="Agregar"
        trailing-icon="i-lucide-chevron-down"
        color="primary"
        size="sm"
      />
    </UDropdownMenu>

    <PoolInvoiceForm v-if="resource === 'invoices'" v-model:open="createOpen" />
    <PoolPaymentForm v-else-if="resource === 'payments'" v-model:open="createOpen" />
    <PoolNoteForm v-else-if="resource === 'notes'" v-model:open="createOpen" />

    <PoolImportModal :resource="resource" v-model:open="importOpen" />
  </div>
</template>
