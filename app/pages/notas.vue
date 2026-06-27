<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Notas' })

const { notes } = usePools()
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
        <p class="text-sm text-muted">
          Contexto operativo interpretado por IA. {{ notes.length }} notas.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <DashboardNoteCard
            v-for="(note, index) in notes"
            :key="index"
            :note="note"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
