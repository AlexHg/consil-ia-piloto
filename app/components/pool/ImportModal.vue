<script setup lang="ts">
import { POOL_META, downloadTextFile, type ImportFormat, type PoolResource } from '~/utils/pools'

const props = defineProps<{
  resource: PoolResource
}>()

const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const meta = computed(() => POOL_META[props.resource])

const file = ref<File | null>(null)
const submitting = ref(false)

watch(open, (value) => {
  if (!value) {
    file.value = null
    submitting.value = false
  }
})

/** Detecta el formato a partir de la extensión y, como respaldo, del contenido. */
function detectFormat(name: string, content: string): ImportFormat {
  if (name.toLowerCase().endsWith('.json')) return 'json'
  if (name.toLowerCase().endsWith('.csv')) return 'csv'
  return content.trim().startsWith('[') || content.trim().startsWith('{') ? 'json' : 'csv'
}

function downloadSample(format: ImportFormat) {
  const sample = meta.value.samples[format]
  const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8'
  downloadTextFile(sample.filename, sample.content, mime)
}

async function onImport() {
  if (!file.value) {
    toast.add({ title: 'Select a CSV or JSON file', color: 'warning', icon: 'i-lucide-triangle-alert' })
    return
  }

  submitting.value = true
  try {
    const content = await file.value.text()
    const format = detectFormat(file.value.name, content)
    const body = format === 'json' ? { json: content } : { csv: content }

    const result = await $fetch<{ created: number }>(meta.value.importEndpoint, {
      method: 'POST',
      body
    })

    await refreshNuxtData(meta.value.refreshKeys)
    toast.add({
      title: 'Import complete',
      description: `${result.created} ${result.created === 1 ? 'record imported' : 'records imported'}.`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'Could not import file',
      description: extractErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-x'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Import ${meta.plural.toLowerCase()} from CSV or JSON`"
    description="Upload a normalized .csv or .json file. Each row or object becomes a pool record."
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex items-start justify-between gap-3 p-4 rounded-lg bg-elevated/60 ring-1 ring-default">
          <div class="flex items-start gap-2.5 min-w-0">
            <UIcon name="i-lucide-file-down" class="size-5 mt-0.5 text-primary shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                Don't know the format?
              </p>
              <p class="text-xs text-muted">
                Download a template with columns and sample data.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              label="CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              size="sm"
              @click="downloadSample('csv')"
            />
            <UButton
              label="JSON"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              size="sm"
              @click="downloadSample('json')"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted uppercase tracking-wide">
            Expected fields
          </p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="column in meta.columns"
              :key="column"
              :label="column"
              color="neutral"
              variant="soft"
              size="sm"
              class="font-mono"
            />
          </div>
        </div>

        <UFileUpload
          v-model="file"
          accept=".csv,.json,text/csv,application/json"
          icon="i-lucide-upload"
          label="Drag your CSV or JSON file here or click to browse"
          description="Format: .csv (column header) or .json (array of objects)"
          class="min-h-40"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          label="Import"
          icon="i-lucide-upload"
          color="primary"
          :loading="submitting"
          :disabled="!file"
          @click="onImport"
        />
      </div>
    </template>
  </UModal>
</template>
