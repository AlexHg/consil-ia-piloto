<script setup lang="ts">
import { downloadTextFile, toCsvContent, toJsonContent, type ExportFormat } from '~/utils/pools'

const props = withDefaults(defineProps<{
  /** Título del modal. */
  title: string
  /** Descripción corta debajo del título. */
  description?: string
  /** Nombre base del archivo, sin extensión. */
  filename: string
  /** Datos completos a exportar como JSON (mantiene estructuras anidadas). */
  jsonData: unknown
  /** Filas planas usadas para el CSV. */
  csvRows: Record<string, unknown>[]
  /** Orden opcional de columnas para el CSV. */
  csvColumns?: string[]
}>(), {
  description: undefined,
  csvColumns: undefined
})

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()

const count = computed(() => props.csvRows.length)
const empty = computed(() => count.value === 0)

const formats = [
  {
    format: 'json' as ExportFormat,
    label: 'JSON',
    icon: 'i-lucide-file-json',
    hint: 'Estructura completa, ideal para integraciones.'
  },
  {
    format: 'csv' as ExportFormat,
    label: 'CSV',
    icon: 'i-lucide-file-spreadsheet',
    hint: 'Tabular, ideal para hojas de cálculo.'
  }
]

function exportAs(format: ExportFormat) {
  if (empty.value) {
    toast.add({ title: 'No hay datos para exportar', color: 'warning', icon: 'i-lucide-triangle-alert' })
    return
  }

  if (format === 'json') {
    downloadTextFile(
      `${props.filename}.json`,
      toJsonContent(props.jsonData),
      'application/json;charset=utf-8'
    )
  } else {
    downloadTextFile(
      `${props.filename}.csv`,
      toCsvContent(props.csvRows, props.csvColumns),
      'text/csv;charset=utf-8'
    )
  }

  toast.add({
    title: 'Export ready',
    description: `${count.value} ${count.value === 1 ? 'record exported' : 'records exported'} as ${format.toUpperCase()}.`,
    color: 'success',
    icon: 'i-lucide-check'
  })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-2.5 p-4 rounded-lg bg-elevated/60 ring-1 ring-default">
          <UIcon name="i-lucide-database" class="size-5 text-primary shrink-0" />
          <p class="text-sm text-default">
            <span class="font-medium text-highlighted">{{ count }}</span>
            {{ count === 1 ? 'record' : 'records' }} ready to export.
            Choose a format below.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="option in formats"
            :key="option.format"
            type="button"
            :disabled="empty"
            class="flex flex-col items-start gap-2 p-4 text-left rounded-lg ring-1 ring-default bg-default transition hover:bg-elevated/60 hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-default disabled:hover:ring-default"
            @click="exportAs(option.format)"
          >
            <div class="flex items-center gap-2">
              <UIcon :name="option.icon" class="size-5 text-primary" />
              <span class="text-sm font-semibold text-highlighted">
                Download {{ option.label }}
              </span>
            </div>
            <span class="text-xs text-muted">{{ option.hint }}</span>
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
