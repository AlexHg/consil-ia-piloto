import { loadNotes } from '../services/ingestion'

export default defineEventHandler(async () => {
  return loadNotes()
})
