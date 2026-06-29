<script setup lang="ts">
import { extractErrorMessage } from '~/utils/pools'

/**
 * Acción destructiva de administración: deja la base completamente vacía
 * (facturas, pagos, notas y conciliaciones).
 *
 * Por su irreversibilidad exige una confirmación explícita: el usuario debe
 * escribir la frase exacta antes de habilitar el borrado. Tras vaciar la base
 * refresca todos los pools del dashboard.
 */
const CONFIRMATION_PHRASE = 'delete anyway'

const open = ref(false)
const confirmation = ref('')
const resetting = ref(false)
const toast = useToast()

const canConfirm = computed(
  () => confirmation.value.trim().toLowerCase() === CONFIRMATION_PHRASE
)

watch(open, (isOpen) => {
  if (!isOpen) confirmation.value = ''
})

async function confirmReset() {
  if (!canConfirm.value || resetting.value) return
  resetting.value = true
  try {
    await $fetch('/api/admin/reset', { method: 'DELETE' })
    open.value = false
    toast.add({
      title: 'Database cleared',
      description: 'All invoices, payments, notes, and reconciliations were removed.',
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    await refreshNuxtData([
      'pool-invoices',
      'pool-payments',
      'pool-notes',
      'reconciliation-summary',
      'reconciliation-results'
    ])
  } catch (error) {
    toast.add({
      title: 'Could not clear database',
      description: extractErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-x'
    })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Reset database"
    description="This data cannot be recovered."
    :ui="{ content: 'max-w-md' }"
  >
    <slot>
      <UButton
        label="Reset database"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        block
        class="justify-start"
      />
    </slot>

    <template #body>
      <div class="space-y-4">
        <p class="flex items-start gap-2 text-sm font-medium text-error leading-relaxed">
          <UIcon name="i-lucide-trash-2" class="size-5 shrink-0 mt-0.5" />
          <span>This data cannot be recovered. Are you sure?</span>
        </p>

        <UFormField
          label="To confirm, type «delete anyway»"
          :ui="{ label: 'text-muted font-normal' }"
        >
          <UInput
            v-model="confirmation"
            placeholder="delete anyway"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="w-full"
            @keydown.enter="confirmReset"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Delete anyway"
          icon="i-lucide-trash-2"
          color="error"
          :disabled="!canConfirm"
          :loading="resetting"
          @click="confirmReset"
        />
      </div>
    </template>
  </UModal>
</template>
