<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { Invoice } from '~~/shared/types/domain'
import { POOL_META, extractErrorMessage } from '~/utils/pools'

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const form = useTemplateRef('form')
const submitting = ref(false)

const currencyItems = ['USD', 'MXN', 'EUR']

function emptyState() {
  return {
    id: '',
    vendor: '',
    amount: undefined as number | undefined,
    currency: 'USD',
    invoiceDate: '',
    dueDate: '',
    poNumber: '',
    status: 'open'
  }
}

const state = reactive(emptyState())

watch(open, (value) => {
  if (!value) {
    Object.assign(state, emptyState())
    submitting.value = false
  }
})

function validate(s: typeof state): FormError[] {
  const errors: FormError[] = []
  if (!s.vendor?.trim()) errors.push({ name: 'vendor', message: 'Requerido' })
  if (s.amount == null || Number(s.amount) <= 0) errors.push({ name: 'amount', message: 'Debe ser mayor a 0' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  submitting.value = true
  try {
    const invoice = await $fetch<Invoice>('/api/invoices', { method: 'POST', body: event.data })
    await refreshNuxtData(POOL_META.invoices.refreshKeys)
    toast.add({
      title: 'Factura creada',
      description: `${invoice.id} · ${invoice.vendor}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'No se pudo crear la factura',
      description: extractErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-x'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Nueva factura"
    description="Alta manual de un documento en el pool de facturas."
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm
        ref="form"
        :state="state"
        :validate="validate"
        class="grid grid-cols-1 sm:grid-cols-2 gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Proveedor" name="vendor" required class="sm:col-span-2">
          <UInput v-model="state.vendor" placeholder="ACME Logistics" class="w-full" />
        </UFormField>

        <UFormField label="Monto" name="amount" required>
          <UInput v-model="state.amount" type="number" step="0.01" min="0" placeholder="1250.00" class="w-full" />
        </UFormField>

        <UFormField label="Moneda" name="currency">
          <USelect v-model="state.currency" :items="currencyItems" class="w-full" />
        </UFormField>

        <UFormField label="Fecha de emisión" name="invoiceDate">
          <UInput v-model="state.invoiceDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="Vencimiento" name="dueDate">
          <UInput v-model="state.dueDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="N° de orden (PO)" name="poNumber">
          <UInput v-model="state.poNumber" placeholder="PO-9001" class="w-full" />
        </UFormField>

        <UFormField label="ID (opcional)" name="id" hint="Se genera automáticamente">
          <UInput v-model="state.id" placeholder="INV-2001" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Crear factura"
          icon="i-lucide-plus"
          color="primary"
          :loading="submitting"
          @click="form?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>
