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
  if (!s.payerName?.trim()) errors.push({ name: 'payerName', message: 'Required' })
  if (s.amount == null || Number(s.amount) <= 0) errors.push({ name: 'amount', message: 'Must be greater than 0' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  submitting.value = true
  try {
    const payment = await $fetch<Payment>('/api/payments', { method: 'POST', body: event.data })
    await refreshNuxtData(POOL_META.payments.refreshKeys)
    toast.add({
      title: 'Payment recorded',
      description: `${payment.id} · ${payment.payerName}`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'Could not record payment',
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
    title="New payment"
    description="Manually add a transaction to the payment pool."
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
        <UFormField label="Payer" name="payerName" required class="sm:col-span-2">
          <UInput v-model="state.payerName" placeholder="ACME Logistics" class="w-full" />
        </UFormField>

        <UFormField label="Amount" name="amount" required>
          <UInput v-model="state.amount" type="number" step="0.01" min="0" placeholder="1250.00" class="w-full" />
        </UFormField>

        <UFormField label="Currency" name="currency">
          <USelect v-model="state.currency" :items="currencyItems" class="w-full" />
        </UFormField>

        <UFormField label="Payment date" name="paymentDate">
          <UInput v-model="state.paymentDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="ID (optional)" name="id" hint="Auto-generated if empty">
          <UInput v-model="state.id" placeholder="PAY-2001" class="w-full" />
        </UFormField>

        <UFormField label="Reference" name="reference" class="sm:col-span-2">
          <UInput v-model="state.reference" placeholder="Payment for INV-2001" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Record payment"
          icon="i-lucide-plus"
          color="primary"
          :loading="submitting"
          @click="form?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>
