import { loadPayments } from '../services/ingestion'

export default defineEventHandler(async () => {
  return loadPayments()
})
