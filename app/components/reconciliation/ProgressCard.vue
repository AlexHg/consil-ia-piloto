<script setup lang="ts">
import type { ReconciliationPhase } from '~/composables/useReconciliation'

/**
 * Card flotante en el footer que refleja el avance de la corrida de conciliación.
 * Lee el estado compartido de `useReconciliation`, por lo que aparece sin importar
 * desde qué pantalla se haya disparado la conciliación.
 */
const { progress, dismissProgress } = useReconciliation()

const visible = computed(() => progress.value.phase !== 'idle')
const isActive = computed(() => progress.value.phase === 'queueing' || progress.value.phase === 'processing')

type UiColor = 'primary' | 'success' | 'error'

const phaseStyle: Record<Exclude<ReconciliationPhase, 'idle'>, { color: UiColor, icon: string, spin: boolean, ring: string }> = {
  queueing: { color: 'primary', icon: 'i-lucide-loader', spin: true, ring: 'bg-primary/10 text-primary ring-primary/15' },
  processing: { color: 'primary', icon: 'i-lucide-loader', spin: true, ring: 'bg-primary/10 text-primary ring-primary/15' },
  done: { color: 'success', icon: 'i-lucide-check', spin: false, ring: 'bg-success/10 text-success ring-success/15' },
  error: { color: 'error', icon: 'i-lucide-triangle-alert', spin: false, ring: 'bg-error/10 text-error ring-error/15' }
}

const style = computed(() => phaseStyle[(progress.value.phase === 'idle' ? 'processing' : progress.value.phase)])
const percentLabel = computed(() => `${Math.round(progress.value.percent)}%`)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="visible"
        class="fixed bottom-6 right-6 z-50 w-[min(22rem,calc(100vw-3rem))]"
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-col gap-4 p-5 rounded-2xl bg-default ring-1 ring-default shadow-lg">
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center size-9 rounded-xl ring-1 shrink-0"
              :class="style.ring"
            >
              <UIcon
                :name="style.icon"
                class="size-5"
                :class="style.spin ? 'animate-spin' : ''"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-highlighted truncate">
                {{ progress.title }}
              </p>
              <p class="text-xs text-muted line-clamp-2">
                {{ progress.message }}
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Hide progress"
              class="-mr-1.5 -mt-1"
              @click="dismissProgress"
            />
          </div>

          <div class="flex items-center gap-3">
            <UProgress
              :model-value="progress.percent"
              :max="100"
              :color="style.color"
              :animation="isActive ? 'carousel' : undefined"
              size="sm"
              class="flex-1"
            />
            <span class="text-xs font-medium text-muted tabular-nums shrink-0">
              {{ percentLabel }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
