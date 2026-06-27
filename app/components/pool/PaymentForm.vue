<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { Payment } from '~~/shared/types/domain'
import { POOL_META, extractErrorMessage } from '~/utils/pools'

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const form = useTemplateRef('form')
const submitting = ref(false)

const currencyItems = ['USD', 'MXN', 'EUR']

function emptyState() {
  return {
    id: '',
    payerName: '',
    amount: undefined as number | undefined,
    currency: 'USD',
    paymentDate: '',
    reference: ''
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
  if (!s.payerName?.trim()) errors.push({ name: 'payerName', message: 'Requerido' })
  if (s.amount == null || Number(s.amount) <= 0) errors.push({ name: 'amount', message: 'Debe ser mayor a 0' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  submitting.value = true
  try {
    const payment = await $fetch<Payment>('/api/payments', { method: 'POST', body: event.data })
    await refreshNuxtData(POOL_META.payments.refreshKeys)
    toast.add({
      title: 'Pago registrado',
      description: `${payment.id} · ${payment.payerName}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'No se pudo registrar el pago',
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
    title="Nuevo pago"
    description="Alta manual de un movimiento en el pool de pagos."
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
        <UFormField label="Pagador" name="payerName" required class="sm:col-span-2">
          <UInput v-model="state.payerName" placeholder="ACME Logistics" class="w-full" />
        </UFormField>

        <UFormField label="Monto" name="amount" required>
          <UInput v-model="state.amount" type="number" step="0.01" min="0" placeholder="1250.00" class="w-full" />
        </UFormField>

        <UFormField label="Moneda" name="currency">
          <USelect v-model="state.currency" :items="currencyItems" class="w-full" />
        </UFormField>

        <UFormField label="Fecha de pago" name="paymentDate">
          <UInput v-model="state.paymentDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="ID (opcional)" name="id" hint="Se genera automáticamente">
          <UInput v-model="state.id" placeholder="PAY-2001" class="w-full" />
        </UFormField>

        <UFormField label="Referencia" name="reference" class="sm:col-span-2">
          <UInput v-model="state.reference" placeholder="Payment for INV-2001" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Registrar pago"
          icon="i-lucide-plus"
          color="primary"
          :loading="submitting"
          @click="form?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>
