/**
 * Repositorio de notas operativas (Notes Pool).
 *
 * El dominio (`OperationalNote`) no expone `id`; la tabla sí lo genera. Hacia
 * arriba se devuelven solo `source` y `text`.
 */

import { useDb } from '../db/client'
import type { OperationalNote } from '~~/shared/types/domain'
import { noteFromRow, noteToRow } from './mappers'

export async function listNotes(): Promise<OperationalNote[]> {
  const rows = await useDb()
    .selectFrom('notes')
    .selectAll()
    .orderBy('created_at', 'desc')
    .execute()
  return rows.map(noteFromRow)
}

export async function insertNote(note: OperationalNote): Promise<OperationalNote> {
  const row = await useDb()
    .insertInto('notes')
    .values(noteToRow(note))
    .returningAll()
    .executeTakeFirstOrThrow()
  return noteFromRow(row)
}

export async function bulkInsertNotes(items: OperationalNote[]): Promise<OperationalNote[]> {
  if (items.length === 0) return []
  const rows = await useDb()
    .insertInto('notes')
    .values(items.map(noteToRow))
    .returningAll()
    .execute()
  return rows.map(noteFromRow)
}
