<script setup lang="ts">
import type { SortDirection } from '~/composables/usePoolSort'

defineProps<{
  options: { value: string, label: string, icon?: string }[]
}>()

const sortKey = defineModel<string>('sortKey', { required: true })
const direction = defineModel<SortDirection>('direction', { required: true })

function toggleDirection() {
  direction.value = direction.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <div class="flex items-center gap-2">
    <USelect
      v-model="sortKey"
      :items="options"
      icon="i-lucide-arrow-up-down"
      size="sm"
      class="min-w-40"
    />
    <UButton
      :icon="direction === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow'"
      color="neutral"
      variant="outline"
      size="sm"
      :aria-label="direction === 'asc' ? 'Ascending order' : 'Descending order'"
      @click="toggleDirection"
    />
  </div>
</template>
