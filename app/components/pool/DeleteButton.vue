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
      title: 'Elemento eliminado',
      description: `${props.label ?? props.id} se quitó del pool de ${meta.value.plural.toLowerCase()}.`,
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    await refreshNuxtData(meta.value.refreshKeys)
  } catch (error) {
    toast.add({
      title: 'No se pudo eliminar',
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
    title="Eliminar del pool"
    description="Esta acción es permanente y no se puede deshacer."
    :ui="{ content: 'max-w-md' }"
  >
    <slot>
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        :aria-label="`Eliminar ${label ?? id}`"
      />
    </slot>

    <template #body>
      <p class="text-sm text-default leading-relaxed">
        ¿Seguro que deseas eliminar
        <span class="font-semibold text-highlighted">{{ label ?? id }}</span>?
        Se quitará de los pools de conocimiento y de cualquier conciliación asociada.
      </p>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Eliminar"
          icon="i-lucide-trash-2"
          color="error"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
