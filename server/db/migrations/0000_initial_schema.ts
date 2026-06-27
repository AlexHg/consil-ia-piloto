/**
 * Migración inicial del esquema de conciliación.
 *
 * Crea las 7 tablas del modelo conceptual con sus índices. Las columnas
 * vectoriales (`pgvector`) y los índices HNSW se declaran con SQL crudo porque
 * el tipo `vector` y el método de acceso `hnsw` no forman parte del schema
 * builder de Kysely.
 *
 * La extensión `vector` se habilita en `server/db/init/01-extensions.sql` al
 * inicializar el contenedor; esta migración asume que ya existe.
 */

import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db)

  // --- invoices -------------------------------------------------------------
  await db.schema
    .createTable('invoices')
    .addColumn('id', 'text', col => col.primaryKey())
    .addColumn('vendor', 'text', col => col.notNull())
    .addColumn('vendor_normalized', 'text')
    .addColumn('invoice_date', 'text', col => col.notNull())
    .addColumn('due_date', 'text', col => col.notNull())
    .addColumn('currency', 'text', col => col.notNull())
    .addColumn('amount', sql`numeric(14, 2)`, col => col.notNull())
    .addColumn('po_number', 'text')
    .addColumn('status', 'text', col => col.notNull().defaultTo('open'))
    .addColumn('source', 'text', col => col.notNull().defaultTo('manual'))
    .addColumn('embedding', sql`vector(1536)`)
    .addColumn('created_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // --- payments -------------------------------------------------------------
  await db.schema
    .createTable('payments')
    .addColumn('id', 'text', col => col.primaryKey())
    .addColumn('payment_date', 'text', col => col.notNull())
    .addColumn('payer_name', 'text', col => col.notNull())
    .addColumn('payer_name_normalized', 'text')
    .addColumn('currency', 'text', col => col.notNull())
    .addColumn('amount', sql`numeric(14, 2)`, col => col.notNull())
    .addColumn('reference', 'text')
    .addColumn('source', 'text', col => col.notNull().defaultTo('manual'))
    .addColumn('embedding', sql`vector(1536)`)
    .addColumn('created_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // --- notes ----------------------------------------------------------------
  await db.schema
    .createTable('notes')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('source', 'text', col => col.notNull())
    .addColumn('text', 'text', col => col.notNull())
    .addColumn('interpreted_summary', 'text')
    .addColumn('referenced_ids', sql`text[]`)
    .addColumn('embedding', sql`vector(1536)`)
    .addColumn('created_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // --- reconciliation_runs --------------------------------------------------
  await db.schema
    .createTable('reconciliation_runs')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('trigger', 'text', col => col.notNull().defaultTo('manual'))
    .addColumn('invoices_count', 'integer')
    .addColumn('started_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .addColumn('finished_at', sql`timestamptz`)
    .execute()

  // --- reconciliations ------------------------------------------------------
  await db.schema
    .createTable('reconciliations')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('invoice_id', 'text', col =>
      col.notNull().references('invoices.id').onDelete('cascade'))
    .addColumn('status', 'text', col => col.notNull())
    .addColumn('confidence', sql`numeric(5, 4)`, col => col.notNull())
    .addColumn('remaining_balance', sql`numeric(14, 2)`)
    .addColumn('suggested_action', 'text', col => col.notNull())
    .addColumn('explanation', 'text', col => col.notNull())
    .addColumn('signals', 'jsonb', col => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('run_id', 'uuid', col =>
      col.references('reconciliation_runs.id').onDelete('set null'))
    .addColumn('created_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // --- reconciliation_payments (N:M) ---------------------------------------
  await db.schema
    .createTable('reconciliation_payments')
    .addColumn('reconciliation_id', 'uuid', col =>
      col.notNull().references('reconciliations.id').onDelete('cascade'))
    .addColumn('payment_id', 'text', col =>
      col.notNull().references('payments.id').onDelete('cascade'))
    .addColumn('applied_amount', sql`numeric(14, 2)`)
    .addPrimaryKeyConstraint('reconciliation_payments_pkey', [
      'reconciliation_id',
      'payment_id'
    ])
    .execute()

  // --- reconciliation_reviews (audit trail, append-only) -------------------
  await db.schema
    .createTable('reconciliation_reviews')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('reconciliation_id', 'uuid', col =>
      col.notNull().references('reconciliations.id').onDelete('cascade'))
    .addColumn('action', 'text', col => col.notNull())
    .addColumn('actor', 'text', col => col.notNull())
    .addColumn('previous_status', 'text')
    .addColumn('new_status', 'text')
    .addColumn('comment', 'text')
    .addColumn('created_at', sql`timestamptz`, col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // --- Índices btree --------------------------------------------------------
  await db.schema.createIndex('invoices_po_number_idx').on('invoices').column('po_number').execute()
  await db.schema.createIndex('invoices_vendor_normalized_idx').on('invoices').column('vendor_normalized').execute()
  await db.schema.createIndex('payments_reference_idx').on('payments').column('reference').execute()
  await db.schema.createIndex('payments_amount_idx').on('payments').column('amount').execute()
  await db.schema.createIndex('reconciliations_invoice_id_idx').on('reconciliations').column('invoice_id').execute()
  await db.schema.createIndex('reconciliations_status_idx').on('reconciliations').column('status').execute()
  await db.schema.createIndex('reconciliation_reviews_recon_id_idx').on('reconciliation_reviews').column('reconciliation_id').execute()

  // --- Índices HNSW para pgvector (distancia coseno) -----------------------
  await sql`CREATE INDEX invoices_embedding_idx ON invoices USING hnsw (embedding vector_cosine_ops)`.execute(db)
  await sql`CREATE INDEX payments_embedding_idx ON payments USING hnsw (embedding vector_cosine_ops)`.execute(db)
  await sql`CREATE INDEX notes_embedding_idx ON notes USING hnsw (embedding vector_cosine_ops)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('reconciliation_reviews').ifExists().execute()
  await db.schema.dropTable('reconciliation_payments').ifExists().execute()
  await db.schema.dropTable('reconciliations').ifExists().execute()
  await db.schema.dropTable('reconciliation_runs').ifExists().execute()
  await db.schema.dropTable('notes').ifExists().execute()
  await db.schema.dropTable('payments').ifExists().execute()
  await db.schema.dropTable('invoices').ifExists().execute()
}
