<script setup lang="ts">
import { POOL_META, downloadTextFile, type PoolResource } from '~/utils/pools'

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

function downloadSample() {
  downloadTextFile(meta.value.sampleFilename, meta.value.sampleCsv)
}

async function onImport() {
  if (!file.value) {
    toast.add({ title: 'Selecciona un archivo CSV', color: 'warning', icon: 'i-lucide-triangle-alert' })
    return
  }

  submitting.value = true
  try {
    const csv = await file.value.text()
    const result = await $fetch<{ created: number }>(meta.value.importEndpoint, {
      method: 'POST',
      body: { csv }
    })

    await refreshNuxtData(meta.value.refreshKeys)
    toast.add({
      title: 'Importación completada',
      description: `${result.created} ${result.created === 1 ? 'registro importado' : 'registros importados'}.`,
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
  } catch (error) {
    toast.add({
      title: 'No se pudo importar el CSV',
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
    :title="`Importar ${meta.plural.toLowerCase()} desde CSV`"
    description="Sube un archivo .csv normalizado. Cada fila se convierte en un registro del pool."
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex items-start justify-between gap-3 p-4 rounded-lg bg-elevated/60 ring-1 ring-default">
          <div class="flex items-start gap-2.5 min-w-0">
            <UIcon name="i-lucide-file-spreadsheet" class="size-5 mt-0.5 text-primary shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-highlighted">
                ¿No sabes el formato?
              </p>
              <p class="text-xs text-muted">
                Descarga la plantilla con las columnas y datos de ejemplo.
              </p>
            </div>
          </div>
          <UButton
            label="Descargar ejemplo"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            size="sm"
            class="shrink-0"
            @click="downloadSample"
          />
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted uppercase tracking-wide">
            Columnas esperadas
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
          accept=".csv,text/csv"
          icon="i-lucide-upload"
          label="Arrastra tu CSV aquí o haz clic para buscar"
          description="Formato CSV (.csv) con la cabecera de columnas"
          class="min-h-40"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          label="Importar"
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
