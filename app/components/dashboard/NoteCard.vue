<script setup lang="ts">
import type { OperationalNote } from '~~/shared/types/domain'

const props = defineProps<{
  note: OperationalNote
}>()

const meta = computed(() => noteSourceMeta(props.note.source))
</script>

<template>
  <article class="flex flex-col gap-3 h-full p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
    <div class="flex items-center gap-2">
      <div class="flex items-center justify-center size-8 rounded-md bg-warning/10 text-warning ring-1 ring-warning/15 shrink-0">
        <UIcon :name="meta.icon" class="size-4" />
      </div>
      <span class="text-xs font-medium text-muted uppercase tracking-wide">
        {{ meta.label }}
      </span>
    </div>

    <p class="text-sm text-default leading-relaxed line-clamp-4">
      {{ note.text }}
    </p>

    <div class="mt-auto flex items-center gap-1.5 text-xs text-dimmed">
      <UIcon name="i-lucide-sparkles" class="size-3.5" />
      Interpretada por IA
    </div>
  </article>
</template>
