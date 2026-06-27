import { listReconciliations } from '../../repositories/reconciliations.repository'

export default defineEventHandler(async () => {
  return listReconciliations()
})
