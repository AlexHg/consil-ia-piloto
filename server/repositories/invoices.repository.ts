/**
 * Repositorio de facturas (Invoice Pool).
 *
 * Acceso a datos sobre PostgreSQL (Kysely). Traduce entre filas y entidades de
 * dominio; nunca expone detalles de persistencia hacia arriba.
 */

import { useDb } from '../db/client'
import type { Invoice } from '~~/shared/types/domain'
import { invoiceFromRow, invoiceToRow } from './mappers'

export async function listInvoices(): Promise<Invoice[]> {
  const rows = await useDb()
    .selectFrom('invoices')
    .selectAll()
    .orderBy('created_at')
    .execute()
  return rows.map(invoiceFromRow)
}

export async function findInvoiceById(id: string): Promise<Invoice | null> {
  const row = await useDb()
    .selectFrom('invoices')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  return row ? invoiceFromRow(row) : null
}

export async function insertInvoice(invoice: Invoice, source = 'manual'): Promise<Invoice> {
  const row = await useDb()
    .insertInto('invoices')
    .values(invoiceToRow(invoice, source))
    .returningAll()
    .executeTakeFirstOrThrow()
  return invoiceFromRow(row)
}

export async function bulkInsertInvoices(items: Invoice[], source = 'csv'): Promise<Invoice[]> {
  if (items.length === 0) return []
  const rows = await useDb()
    .insertInto('invoices')
    .values(items.map(invoice => invoiceToRow(invoice, source)))
    .onConflict(oc => oc.column('id').doNothing())
    .returningAll()
    .execute()
  return rows.map(invoiceFromRow)
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const result = await useDb()
    .deleteFrom('invoices')
    .where('id', '=', id)
    .executeTakeFirst()
  return Number(result.numDeletedRows ?? 0) > 0
}
