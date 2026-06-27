import type { ComputedRef, Ref } from 'vue'

/** Tamaños de página disponibles para los pools. */
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

/**
 * Paginación reutilizable para las páginas de pools.
 *
 * Recibe la lista reactiva (normalmente ya ordenada) y expone el estado del
 * tamaño de página (`pageSize`), la página actual (`page`) y la porción visible
 * (`paginated`), además del total y el rango mostrado para la UI.
 *
 * - Al cambiar el tamaño de página se vuelve a la primera página.
 * - Si la lista se encoge, la página actual se ajusta para no quedar fuera de rango.
 */
export function usePagination<T>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options?: { pageSize?: number }
) {
  const pageSize = ref<number>(options?.pageSize ?? PAGE_SIZE_OPTIONS[0])
  const page = ref(1)

  const total = computed(() => items.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  watch(pageSize, () => {
    page.value = 1
  })

  watch([total, pageCount], () => {
    if (page.value > pageCount.value) page.value = pageCount.value
  })

  const paginated = computed<T[]>(() => {
    const start = (page.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })

  const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
  const rangeEnd = computed(() => Math.min(page.value * pageSize.value, total.value))

  return { page, pageSize, total, pageCount, paginated, rangeStart, rangeEnd }
}
