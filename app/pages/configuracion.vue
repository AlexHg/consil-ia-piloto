<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useSeoMeta({ title: 'Configuración' })
</script>

<template>
  <UDashboardPanel id="configuracion">
    <template #header>
      <UDashboardNavbar title="Configuración" :ui="{ right: 'gap-2' }">
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
        <div class="flex items-center justify-center size-14 rounded-lg bg-elevated text-muted ring-1 ring-default">
          <UIcon name="i-lucide-settings" class="size-7" />
        </div>
        <h2 class="text-lg font-semibold text-highlighted">
          Configuración
        </h2>
        <p class="max-w-md text-sm text-muted">
          Reglas de conciliación, fuentes de datos, proveedores y preferencias del equipo.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
