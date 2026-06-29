<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import type { OperationalNote } from '~~/shared/types/domain'
import { POOL_META, extractErrorMessage } from '~/utils/pools'

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const form = useTemplateRef('form')
const submitting = ref(false)

const sourceItems = [
  { label: 'Email', value: 'email' },
  { label: 'Slack', value: 'slack' },
  { label: 'Operations', value: 'ops-note' },
  { label: 'Other', value: 'unknown' }
]

function emptyState() {
  return {
    source: 'email',
    text: ''
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
  if (!s.text?.trim()) errors.push({ name: 'text', message: 'Required' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  submitting.value = true
  try {
    await $fetch<OperationalNote>('/api/notes', { method: 'POST', body: event.data })
    await refreshNuxtData(POOL_META.notes.refreshKeys)
    toast.add({
      title: 'Note created',
      description: 'AI will interpret it on the next reconciliation run.',
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'Could not create note',
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
    title="New operational note"
    description="Context that AI will use to enrich reconciliation."
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm
        ref="form"
        :state="state"
        :validate="validate"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Source" name="source">
          <USelect v-model="state.source" :items="sourceItems" class="w-full" />
        </UFormField>

        <UFormField label="Text" name="text" required>
          <UTextarea
            v-model="state.text"
            :rows="5"
            autoresize
            placeholder="ACME Logistics confirmed payment for invoice INV-2001."
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Create note"
          icon="i-lucide-plus"
          color="primary"
          :loading="submitting"
          @click="form?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>
