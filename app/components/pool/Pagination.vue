<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/composables/usePagination'

defineProps<{
  total: number
  rangeStart: number
  rangeEnd: number
}>()

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

const pageSizeItems = PAGE_SIZE_OPTIONS.map(value => ({ label: `${value} por página`, value }))
</script>

<template>
  <div v-if="total > 0" class="flex flex-wrap items-center justify-between gap-3 pt-2">
    <p class="text-xs text-muted tabular-nums">
      Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ total }}
    </p>

    <div class="flex items-center gap-2">
      <USelect
        v-model="pageSize"
        :items="pageSizeItems"
        icon="i-lucide-rows-3"
        size="sm"
        class="min-w-36"
      />
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        size="sm"
      />
    </div>
  </div>
</template>
