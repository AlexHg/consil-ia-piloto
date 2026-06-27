<script setup lang="ts">
import type { OperationalNote } from '~~/shared/types/domain'

const props = defineProps<{
  note: OperationalNote
}>()

const open = ref(false)

const meta = computed(() => noteSourceMeta(props.note.source))
const interpreted = computed(() => Boolean(props.note.interpretedSummary))
const referencedIds = computed(() => props.note.referencedIds ?? [])
</script>

<template>
  <UModal
    v-model:open="open"
    :title="meta.label"
    :description="interpreted ? 'Nota interpretada por la IA' : 'Nota pendiente de interpretación'"
    :ui="{ content: 'max-w-lg' }"
  >
    <article
      role="button"
      tabindex="0"
      class="group flex flex-col gap-3 h-full w-full text-left p-5 rounded-md bg-default ring-1 ring-default shadow-sm transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @keydown.enter.prevent="open = true"
      @keydown.space.prevent="open = true"
    >
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

      <div
        class="mt-auto flex items-center gap-1.5 text-xs"
        :class="interpreted ? 'text-primary' : 'text-dimmed'"
      >
        <UIcon :name="interpreted ? 'i-lucide-sparkles' : 'i-lucide-clock'" class="size-3.5" />
        {{ interpreted ? 'Interpretada por IA' : 'Pendiente de interpretación' }}
      </div>
    </article>

    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-muted uppercase tracking-wide">
            Texto original
          </span>
          <p class="text-sm text-default leading-relaxed whitespace-pre-line">
            {{ note.text }}
          </p>
        </div>

        <div
          v-if="interpreted"
          class="flex flex-col gap-1.5 p-4 rounded-md bg-primary/5 ring-1 ring-primary/15"
        >
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-primary uppercase tracking-wide">
            <UIcon name="i-lucide-sparkles" class="size-3.5" />
            Interpretación de IA
          </span>
          <p class="text-sm text-default leading-relaxed">
            {{ note.interpretedSummary }}
          </p>
        </div>
        <div
          v-else
          class="flex items-start gap-2 p-4 rounded-md bg-elevated text-sm text-muted"
        >
          <UIcon name="i-lucide-clock" class="size-4 mt-0.5 shrink-0" />
          <span>
            La IA aún no ha interpretado esta nota. Se enriquecerá automáticamente
            en la próxima conciliación.
          </span>
        </div>

        <div v-if="referencedIds.length" class="flex flex-col gap-2">
          <span class="text-xs font-medium text-muted uppercase tracking-wide">
            Documentos referenciados
          </span>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="ref in referencedIds"
              :key="ref"
              :label="ref"
              color="neutral"
              variant="soft"
              size="sm"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <PoolDeleteButton
          v-if="note.id"
          resource="notes"
          :id="note.id"
          label="esta nota"
          @deleted="open = false"
        >
          <UButton label="Eliminar" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" />
        </PoolDeleteButton>
        <span v-else />
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
