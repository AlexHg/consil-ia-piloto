import { resetDatabase } from '../../services/admin'

/**
 * Vacía por completo la base de datos (todos los pools y conciliaciones).
 *
 * Operación destructiva e irreversible. Endpoint delgado: delega en el servicio
 * de administración.
 */
export default defineEventHandler(async () => {
  await resetDatabase()
  return { reset: true }
})
