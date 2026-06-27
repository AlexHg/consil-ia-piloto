<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Panel IA' })
</script>

<template>
  <UDashboardPanel id="ia">
    <template #header>
      <UDashboardNavbar title="Panel IA" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col items-center justify-center gap-3 h-full min-h-96 text-center">
        <div class="flex items-center justify-center size-14 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <UIcon name="i-lucide-sparkles" class="size-7" />
        </div>
        <h2 class="text-lg font-semibold text-highlighted">
          Panel de IA
        </h2>
        <p class="max-w-md text-sm text-muted">
          Aquí vivirá la actividad de la IA: conciliaciones en proceso, última decisión,
          nivel de confianza, reglas utilizadas y aprendizajes recientes.
          La IA enriquece; nunca decide la conciliación.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
