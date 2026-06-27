<script setup lang="ts">
type UiColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

withDefaults(defineProps<{
  label: string
  value: string | number
  icon: string
  caption?: string
  color?: UiColor
  loading?: boolean
}>(), {
  color: 'neutral'
})

const colorClasses: Record<UiColor, string> = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  secondary: 'bg-secondary/10 text-secondary ring-secondary/15',
  success: 'bg-success/10 text-success ring-success/15',
  info: 'bg-info/10 text-info ring-info/15',
  warning: 'bg-warning/10 text-warning ring-warning/15',
  error: 'bg-error/10 text-error ring-error/15',
  neutral: 'bg-elevated text-muted ring-default'
}
</script>

<template>
  <div class="group flex flex-col gap-4 p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
    <div class="flex items-start justify-between gap-3">
      <p class="text-sm font-medium text-muted">
        {{ label }}
      </p>
      <div
        class="flex items-center justify-center size-9 rounded-md ring-1 shrink-0"
        :class="colorClasses[color]"
      >
        <UIcon :name="icon" class="size-5" />
      </div>
    </div>

    <div>
      <USkeleton v-if="loading" class="h-8 w-24" />
      <p v-else class="text-3xl font-semibold tracking-tight text-highlighted tabular-nums">
        {{ value }}
      </p>
      <p v-if="caption" class="mt-1 text-xs text-muted">
        {{ caption }}
      </p>
    </div>
  </div>
</template>
