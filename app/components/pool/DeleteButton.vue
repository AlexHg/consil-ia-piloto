<script setup lang="ts">
import { POOL_META, extractErrorMessage, type PoolResource } from '~/utils/pools'

/**
 * Borrado de una entidad de cualquier pool (factura, pago o nota) con
 * confirmación. Encapsula el `DELETE` al endpoint correspondiente, el refresco
 * de los datos del dashboard y los toasts. El trigger es personalizable por slot
 * (por defecto, un botón de papelera discreto).
 */
const props = defineProps<{
  resource: PoolResource
  id: string
  label?: string
}>()

const emit = defineEmits<{ deleted: [] }>()

const open = ref(false)
const deleting = ref(false)
const toast = useToast()

const meta = computed(() => POOL_META[props.resource])

async function confirmDelete() {
  if (deleting.value) return
  deleting.value = true
  try {
    await $fetch(`/api/${props.resource}/${encodeURIComponent(props.id)}`, { method: 'DELETE' })
    open.value = false
    emit('deleted')
    toast.add({
      title: 'Item deleted',
      description: `${props.label ?? props.id} was removed from the ${meta.value.plural.toLowerCase()} pool.`,
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    await refreshNuxtData(meta.value.refreshKeys)
  } catch (error) {
    toast.add({
      title: 'Could not delete',
      description: extractErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-x'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Remove from pool"
    description="This action is permanent and cannot be undone."
    :ui="{ content: 'max-w-md' }"
  >
    <slot>
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="`Delete ${label ?? id}`"
      />
    </slot>

    <template #body>
      <p class="text-sm text-default leading-relaxed">
        Are you sure you want to delete
        <span class="font-semibold text-highlighted">{{ label ?? id }}</span>?
        It will be removed from the knowledge pools and any associated reconciliation.
      </p>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
