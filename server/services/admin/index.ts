import { truncateAllPools } from '../../repositories/admin.repository'

/**
 * Servicio de administración.
 *
 * Operaciones de mantenimiento sobre el estado global del sistema. La lógica de
 * borrado vive aquí para mantener delgados los endpoints de `server/api/`.
 */

/**
 * Deja la base completamente vacía: borra facturas, pagos, notas y todas las
 * conciliaciones. Operación irreversible.
 */
export async function resetDatabase(): Promise<void> {
  await truncateAllPools()
}
