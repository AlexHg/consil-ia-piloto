<script setup lang="ts" generic="T">
import type { CarouselItem } from '@nuxt/ui'

type UiColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon: string
  items: T[]
  to?: string
  color?: UiColor
  loading?: boolean
  emptyLabel?: string
}>(), {
  color: 'primary',
  emptyLabel: 'Sin documentos en este pool todavía.'
})

defineSlots<{
  default(props: { item: T }): unknown
}>()

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
  <section class="flex flex-col gap-4 ">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center size-10 rounded-md ring-1 shrink-0" :class="colorClasses[color]">
          <UIcon :name="icon" class="size-5" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-semibold text-highlighted truncate">
              {{ title }}
            </h2>
            <UBadge :label="String(items.length)" :color="color" variant="soft" size="sm" />
          </div>
          <p v-if="subtitle" class="text-xs text-muted truncate">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <UButton v-if="to" :to="to" label="Ver todos" color="neutral" variant="ghost" size="sm"
        trailing-icon="i-lucide-arrow-right" class="shrink-0" />
    </div>

    <div v-if="loading" class="flex gap-4">
      <USkeleton v-for="n in 4" :key="n" class="h-36 basis-[300px] shrink-0 rounded-md" />
    </div>

    <div v-else-if="items.length === 0"
      class="flex items-center justify-center h-36 rounded-md ring-1 ring-dashed ring-default text-sm text-muted">
      {{ emptyLabel }}
    </div>
    <UCarousel v-slot="{ item }" :items="(items as CarouselItem[])" wheel-gestures drag-free contain-scroll="trimSnaps"
      :ui="{
      viewport: 'overflow-hidden',
      container: '-ms-4',
      item: 'ps-4 basis-[300px] sm:basis-[330px]'
    }">
      <div class="h-full my-2">
        <slot :item="(item as T)" />
      </div>
    </UCarousel>
  </section>
</template>
