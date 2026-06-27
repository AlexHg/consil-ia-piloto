import type { ComputedRef, Ref } from 'vue'

export type SortDirection = 'asc' | 'desc'

/**
 * Opción de ordenamiento para un pool. `compare` define el orden ascendente;
 * la dirección descendente se obtiene invirtiendo el resultado.
 */
export interface PoolSortOption<T> {
  value: string
  label: string
  icon?: string
  compare: (a: T, b: T) => number
}

/**
 * Ordenamiento reutilizable para las páginas de pools.
 *
 * Recibe la lista reactiva y las opciones disponibles, y expone el estado del
 * selector (`sortKey`), la dirección (`direction`) y la lista ya ordenada. Las
 * opciones para el `<USelect>` se derivan automáticamente.
 */
export function usePoolSort<T>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options: PoolSortOption<T>[],
  defaults?: { key?: string, direction?: SortDirection }
) {
  const sortKey = ref<string>(defaults?.key ?? options[0]?.value ?? '')
  const direction = ref<SortDirection>(defaults?.direction ?? 'asc')

  const selectItems = options.map(({ value, label, icon }) => ({ value, label, icon }))

  const sorted = computed<T[]>(() => {
    const option = options.find(o => o.value === sortKey.value)
    if (!option) return [...items.value]
    const factor = direction.value === 'asc' ? 1 : -1
    return [...items.value].sort((a, b) => option.compare(a, b) * factor)
  })

  function toggleDirection() {
    direction.value = direction.value === 'asc' ? 'desc' : 'asc'
  }

  return { sortKey, direction, sorted, selectItems, toggleDirection }
}
