<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Notas' })

const { notes } = usePools()

// Las notas no tienen estado/fecha/monto; se ordenan por los campos que sí
// existen en el dominio (fuente y texto).
const {
  sortKey,
  direction,
  sorted: sortedNotes,
  selectItems: sortOptions
} = usePoolSort(notes, [
  {
    value: 'source',
    label: 'Por fuente',
    icon: 'i-lucide-inbox',
    compare: (a, b) => a.source.localeCompare(b.source)
  },
  {
    value: 'text',
    label: 'Por texto',
    icon: 'i-lucide-text',
    compare: (a, b) => a.text.localeCompare(b.text)
  }
])

const { page, pageSize, total, rangeStart, rangeEnd, paginated } = usePagination(sortedNotes)
</script>

<template>
  <UDashboardPanel id="notas">
    <template #header>
      <UDashboardNavbar title="Notas" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <PoolActions resource="notes" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Contexto operativo interpretado por IA. {{ notes.length }} notas.
          </p>
          <PoolSortControls
            v-model:sort-key="sortKey"
            v-model:direction="direction"
            :options="sortOptions"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardNoteCard
            v-for="(note, index) in paginated"
            :key="note.id ?? `${note.source}-${index}`"
            :note="note"
          />
        </div>

        <PoolPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :total="total"
          :range-start="rangeStart"
          :range-end="rangeEnd"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
