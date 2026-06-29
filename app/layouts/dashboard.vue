<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { invoices, payments, notes, summary } = usePools()

const navItems = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/'
    }
  ],
  [
    {
      label: 'Invoices',
      icon: 'i-lucide-file-text',
      to: '/facturas',
      badge: invoices.value.length || undefined
    },
    {
      label: 'Payments',
      icon: 'i-lucide-banknote',
      to: '/pagos',
      badge: payments.value.length || undefined
    },
    {
      label: 'Notes',
      icon: 'i-lucide-sticky-note',
      to: '/notas',
      badge: notes.value.length || undefined
    }
  ],
  [
    {
      label: 'Reconciled',
      icon: 'i-lucide-link-2',
      to: '/conciliados',
      badge: summary.value.matched || undefined
    }
  ]
])
</script>

<template>
  <UDashboardGroup storage-key="reconciliation-dashboard">
    <UDashboardSidebar id="sidebar" resizable collapsible :min-size="11" :default-size="13" :max-size="17">
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2.5 w-full">
          <div
            class="flex items-center justify-center size-9 rounded-md bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0">
            <UIcon name="i-lucide-git-compare-arrows" class="size-5" />
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <p class="text-sm font-semibold text-highlighted truncate">
              Concil.ia
            </p>
            <p class="text-[11px] text-muted truncate">
              Mission Control
            </p>
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :items="navItems" :collapsed="collapsed" orientation="vertical" tooltip
          :ui="{ link: 'gap-3' }" />
      </template>

      <template #footer="{ collapsed }">
        <AdminResetDatabaseButton>
          <UButton
            :label="collapsed ? undefined : 'Reset database'"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            :block="!collapsed"
            :square="collapsed"
            :class="collapsed ? '' : 'justify-start'"
            aria-label="Reset database"
          />
        </AdminResetDatabaseButton>
      </template>
    </UDashboardSidebar>

    <slot />

    <ReconciliationProgressCard />
  </UDashboardGroup>
</template>
