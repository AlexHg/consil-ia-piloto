/**
 * Repositorio de pagos (Payment Pool).
 */

import { useDb } from '../db/client'
import type { Payment } from '~~/shared/types/domain'
import { paymentFromRow, paymentToRow } from './mappers'

export async function listPayments(): Promise<Payment[]> {
  const rows = await useDb()
    .selectFrom('payments')
    .selectAll()
    .orderBy('created_at')
    .execute()
  return rows.map(paymentFromRow)
}

export async function findPaymentById(id: string): Promise<Payment | null> {
  const row = await useDb()
    .selectFrom('payments')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  return row ? paymentFromRow(row) : null
}

export async function insertPayment(payment: Payment, source = 'manual'): Promise<Payment> {
  const row = await useDb()
    .insertInto('payments')
    .values(paymentToRow(payment, source))
    .returningAll()
    .executeTakeFirstOrThrow()
  return paymentFromRow(row)
}

export async function bulkInsertPayments(items: Payment[], source = 'csv'): Promise<Payment[]> {
  if (items.length === 0) return []
  const rows = await useDb()
    .insertInto('payments')
    .values(items.map(payment => paymentToRow(payment, source)))
    .onConflict(oc => oc.column('id').doNothing())
    .returningAll()
    .execute()
  return rows.map(paymentFromRow)
}

export async function deletePayment(id: string): Promise<boolean> {
  const result = await useDb()
    .deleteFrom('payments')
    .where('id', '=', id)
    .executeTakeFirst()
  return Number(result.numDeletedRows ?? 0) > 0
}
