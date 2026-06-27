import { loadInvoices } from '../services/ingestion'

export default defineEventHandler(async () => {
  return loadInvoices()
})
