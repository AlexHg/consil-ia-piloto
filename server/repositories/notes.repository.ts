/**
 * Repositorio de notas operativas (Notes Pool).
 *
 * El dominio (`OperationalNote`) no expone `id`; la tabla sí lo genera. Hacia
 * arriba se devuelven solo `source` y `text`.
 */

import { sql } from 'kysely'
import { useDb } from '../db/client'
import type { OperationalNote } from '~~/shared/types/domain'
import { noteFromRow, noteToRow } from './mappers'

/**
 * Nota con su `id` de tabla. El dominio (`OperationalNote`) no expone `id`, pero
 * el enriquecimiento (embeddings, interpretación) necesita direccionar la fila.
 */
export interface NoteRecord {
  id: string
  note: OperationalNote
}

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

/** Notas sin embedding, con su `id` para poder actualizarlas. */
export async function listNotesMissingEmbedding(): Promise<NoteRecord[]> {
  const rows = await useDb()
    .selectFrom('notes')
    .select(['id', 'source', 'text'])
    .where('embedding', 'is', null)
    .orderBy('created_at')
    .execute()
  return rows.map(row => ({ id: row.id, note: { source: row.source, text: row.text } }))
}

/** Notas sin interpretación de IA, con su `id`. */
export async function listNotesMissingInterpretation(): Promise<NoteRecord[]> {
  const rows = await useDb()
    .selectFrom('notes')
    .select(['id', 'source', 'text'])
    .where('interpreted_summary', 'is', null)
    .orderBy('created_at')
    .execute()
  return rows.map(row => ({ id: row.id, note: { source: row.source, text: row.text } }))
}

/** Persiste el embedding de una nota (literal pgvector `'[...]'`). */
export async function updateNoteEmbedding(id: string, literal: string): Promise<void> {
  await useDb()
    .updateTable('notes')
    .set({ embedding: sql<string>`${literal}::vector` })
    .where('id', '=', id)
    .execute()
}

/** Persiste la interpretación de IA de una nota (resumen + IDs referenciados). */
export async function updateNoteInterpretation(
  id: string,
  summary: string,
  referencedIds: string[]
): Promise<void> {
  await useDb()
    .updateTable('notes')
    .set({ interpreted_summary: summary, referenced_ids: referencedIds })
    .where('id', '=', id)
    .execute()
}
