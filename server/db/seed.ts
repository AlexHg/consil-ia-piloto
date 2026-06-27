/**
 * Seed de datos de muestra (`data/samples`) hacia PostgreSQL.
 *
 * Uso:
 *   pnpm db:seed
 *
 * Reinicia los pools (invoices, payments, notes) y vuelve a sembrarlos desde los
 * archivos de muestra. El TRUNCATE en cascada también limpia conciliaciones
 * previas, dejando un estado reproducible para demos y desarrollo.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { sql } from 'kysely'
import { parseCsv } from '../utils/csv'
import { normalizeInvoiceRow, normalizePaymentRow } from '../services/ingestion/normalize'
import { bulkInsertInvoices } from '../repositories/invoices.repository'
import { bulkInsertPayments } from '../repositories/payments.repository'
import { bulkInsertNotes } from '../repositories/notes.repository'
import { useDb } from './client'
import { loadEnv } from './env'
import type { OperationalNote } from '~~/shared/types/domain'

const SAMPLES_DIR = path.join(process.cwd(), 'data', 'samples')

async function run(): Promise<void> {
  loadEnv()

  const [invoicesCsv, paymentsCsv, notesJson] = await Promise.all([
    readFile(path.join(SAMPLES_DIR, 'invoices.csv'), 'utf-8'),
    readFile(path.join(SAMPLES_DIR, 'payments.csv'), 'utf-8'),
    readFile(path.join(SAMPLES_DIR, 'notes.json'), 'utf-8')
  ])

  const invoices = parseCsv(invoicesCsv).map(normalizeInvoiceRow).filter(i => i.id)
  const payments = parseCsv(paymentsCsv).map(normalizePaymentRow).filter(p => p.id)
  const notes = (JSON.parse(notesJson) as Array<Partial<OperationalNote>>).map(note => ({
    source: note.source ?? 'unknown',
    text: note.text ?? ''
  })).filter(n => n.text)

  const db = useDb()
  await sql`TRUNCATE TABLE invoices, payments, notes RESTART IDENTITY CASCADE`.execute(db)

  const [invoicesInserted, paymentsInserted, notesInserted] = await Promise.all([
    bulkInsertInvoices(invoices, 'csv'),
    bulkInsertPayments(payments, 'csv'),
    bulkInsertNotes(notes)
  ])

  console.log(`✓ Seed completado: ${invoicesInserted.length} facturas, ${paymentsInserted.length} pagos, ${notesInserted.length} notas`)

  await db.destroy()
}

run().catch((error) => {
  console.error('Falló el seed:', error)
  process.exit(1)
})
