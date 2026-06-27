# Arquitectura del Motor de IA — AI Reconciliation Engine

## Objetivo

El motor de IA **no toma decisiones financieras**. Su responsabilidad es **enriquecer** la
información, **recuperar evidencia** y **explicar** el resultado del motor de reglas. La
conciliación la decide siempre el **motor determinístico** (reglas), y todo queda
**auditado**.

El procesamiento está **desacoplado** de la ingesta mediante una cola **pg-boss** que vive
en la misma base PostgreSQL. Esto permite que importar datos y conciliar sean operaciones
independientes, con reintentos y trazabilidad, sin añadir Redis/SQS.

## Flujo general

```text
CSV | PDF | Imagen | CRUD | Notas
              │
              ▼
        Ingestion Layer ──(persiste)──► Knowledge Pools (PostgreSQL + pgvector)
              │
              │  (encola job)
              ▼
        ┌─────────────────────── pg-boss (cola en PostgreSQL) ───────────────────────┐
        │                                                                             │
        ▼                                                                             │
 Reconciliation Worker                                                                │
   ├─ Candidate Retrieval (pgvector)                                                  │
   ├─ Evidence Builder                                                                │
   ├─ Rule-based Decision Engine  ── decisión determinística                          │
   ├─ Confidence Engine                                                               │
   ├─ AI Explanation (enriquecimiento, opcional)                                      │
   └─ Persiste ReconciliationResult ──► reconciliations / reconciliation_payments     │
        │                                                                             │
        └─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
        Human Review Workspace
```

## Componentes

### OCR (bonus)
- Extrae información de PDFs e imágenes y produce un objeto `Invoice`.
- Se ejecuta en la capa de ingesta/enriquecimiento, **antes** de persistir.

### Normalización
- Corrige nombres de proveedores y estandariza monedas, referencias y fechas.
- Alimenta los campos `vendor_normalized` / `payer_name_normalized`.

### Embeddings
- Genera embeddings para `invoices`, `payments` y `operational notes`.
- Se almacenan en PostgreSQL vía `pgvector` (columnas `embedding vector(1536)`).
- **Solo** sirven para recuperar candidatos; nunca deciden el match.
- Si no hay `OPENAI_API_KEY`, el proveedor es *mock* y el retrieval cae a heurísticas
  determinísticas (referencia/monto/proveedor).

### Candidate Retrieval
Recupera los mejores candidatos combinando coincidencias exactas, similitud semántica
(`pgvector`) y notas relacionadas. Solo **propone** candidatos.

### Evidence Builder
Convierte las señales en evidencia estructurada (`EvidenceSignal[]`): Invoice ID, PO,
Vendor similarity, Amount, Currency, Notes, Duplicate detection.

### Rule Engine
Reglas independientes y trazables: InvoiceNumberRule, PONumberRule,
VendorSimilarityRule, AmountRule, CurrencyRule, ReferenceRule, DiscountRule,
DuplicateRule, NotesRule. Produce el estado: `Matched | Partial Match | Needs Review |
Suspicious | Unmatched`.

### Confidence Engine
Calcula un score trazable a partir de la evidencia (suma de pesos de señales).

### AI Explanation
Recibe **únicamente** `resultado + confidence + evidencia` y genera `explanation` y
`suggestedAction`. **Nunca modifica la decisión.** Tiene *fallback* determinístico cuando
la IA no está disponible.

## Procesamiento con pg-boss

### Por qué pg-boss
- Usa la **misma** base PostgreSQL (fuente de verdad), en su **propio esquema** (`pgboss`),
  aislado de las tablas de dominio. Cero infraestructura extra.
- Desacopla ingesta y conciliación, con **reintentos**, **backoff** y **trazabilidad**.
- `useListenNotify` despierta a los workers al instante (sin esperar al polling).

### Infraestructura actual (implementada)

| Pieza | Archivo | Rol |
|---|---|---|
| Instancia singleton | [`server/queue/boss.ts`](../../server/queue/boss.ts) | `useBoss()` (start/stop), nombres de colas en `QUEUES`. |
| Arranque, worker y cierre | [`server/plugins/queue.ts`](../../server/plugins/queue.ts) | Plugin Nitro: crea la cola, **registra el worker**, encola un run inicial si no hay datos, y cierra de forma ordenada. |
| Productor + worker | [`server/services/reconciliation/queue.ts`](../../server/services/reconciliation/queue.ts) | `enqueueReconciliation()` y `registerReconciliationWorker()`. |
| Pipeline + persistencia | [`server/services/reconciliation/service.ts`](../../server/services/reconciliation/service.ts) | `runReconciliation()`: motor + `createRun`/`saveResults`/`finishRun`. |
| Esquema | variable `PGBOSS_SCHEMA` (default `pgboss`) | pg-boss instala/migra su esquema en el primer `start()`. |

Hoy existe **una sola cola**: `reconciliation`. El esquema de pg-boss se crea
automáticamente; el de dominio se crea con las migraciones de Kysely + el `db:seed`.

> Nota de implementación: el worker se registra dentro del plugin `queue.ts` (junto con la
> creación de la cola). En dev, un plugin de Nitro **nuevo** no se recarga en caliente; al
> consolidarlo en el plugin existente se garantiza que el worker arranque con la cola.

### Diseño de colas y jobs

| Cola / Job | Estado | Productor | Consumidor (worker) | Payload |
|---|---|---|---|---|
| `reconciliation` | **Implementada** (productor + worker + lectura desde BD) | Endpoints de importación/alta (debounced) y `POST /api/reconciliation/run` | Reconciliation Worker | `{ trigger }` |
| `embedding.generate` | Roadmap (enriquecimiento IA) | Ingesta tras persistir | Embedding Worker | `{ entity: 'invoice'\|'payment'\|'note', id }` |
| `explanation.generate` | Roadmap (enriquecimiento IA) | Worker de conciliación (post-decisión) | Explanation Worker | `{ reconciliationId }` |

> Las colas de IA (`embedding.generate`, `explanation.generate`) son **opcionales y no
> bloqueantes**: si fallan o están deshabilitadas, la conciliación determinística ya quedó
> decidida y persistida. La IA nunca está en el camino crítico de la decisión.

### Productor (encolar)

Tras **persistir** una importación/alta (o al llamar `POST /api/reconciliation/run`), se
encola un job en la cola `reconciliation`:

```ts
import { useBoss, QUEUES } from '~~/server/queue/boss'

const boss = await useBoss()
await boss.send(QUEUES.reconciliation, { trigger: 'import' }, {
  // Idempotencia: colapsa ráfagas de imports en un único job pendiente.
  singletonKey: 'reconciliation:pending',
  retryLimit: 3,
  retryBackoff: true
})
```

### Consumidor (worker)

El worker corre el pipeline determinístico y persiste el resultado. Se registra una sola
vez (en un plugin Nitro), reutilizando el motor (`reconcileAll`) y los repositorios:

```ts
import { useBoss, QUEUES } from '~~/server/queue/boss'
import { loadInvoices, loadPayments, loadNotes } from '~~/server/services/ingestion'
import { reconcileAll } from '~~/server/services/reconciliation/engine'
import { createRun, finishRun, saveResults } from '~~/server/repositories/reconciliations.repository'

const boss = await useBoss()
await boss.work(QUEUES.reconciliation, async ([job]) => {
  const trigger = job.data?.trigger ?? 'manual'
  const [invoices, payments, notes] = await Promise.all([
    loadInvoices(), loadPayments(), loadNotes()
  ])

  const runId = await createRun(trigger, invoices.length)   // reconciliation_runs
  const results = reconcileAll(invoices, payments, notes)    // motor determinístico
  await saveResults(results, runId)                          // reconciliations (+ N:M)
  await finishRun(runId)
  // (opcional) encolar explanation.generate por cada resultado.
})
```

### Persistencia y trazabilidad

Cada ejecución del worker genera:
- una fila en `reconciliation_runs` (`trigger`, `invoices_count`, `started_at`/`finished_at`);
- una fila por factura en `reconciliations` (estado, `confidence`, `signals`, `explanation`,
  `suggested_action`, `run_id`);
- los pagos vinculados en `reconciliation_payments` (N:M).

Los endpoints de lectura (`GET /api/reconciliation`, `/summary`) consultan la **última
ejecución persistida** en lugar de recalcular en cada request.

### Idempotencia, reintentos y errores
- **Idempotencia de encolado:** `singletonKey` evita acumular jobs redundantes ante ráfagas
  de importación.
- **Reintentos:** `retryLimit` + `retryBackoff` para fallos transitorios (DB, IA).
- **Aislamiento de fallos:** un error en el enriquecimiento por IA no revierte la decisión
  determinística ya persistida.
- **Errores de pg-boss:** se escuchan con `boss.on('error', …)` para no tumbar el proceso.

### Ciclo de vida
- Al **arrancar** Nitro, el plugin llama `useBoss()` (instala/migra el esquema `pgboss`),
  crea las colas y registra los workers.
- Al **apagar** Nitro (`hook('close')`), `stopBoss({ graceful: true })` cierra conexiones y
  listeners sin dejar nada colgado.
- La instancia es **singleton** vía `globalThis` para sobrevivir al hot-reload de Nitro.

## Pipeline (por ejecución)

```text
(import/alta/CRUD) ──► persistencia (Kysely repos)
        │
        ▼  send('reconciliation')
   pg-boss queue
        │
        ▼  work('reconciliation')
   Reconciliation Worker
        ├─ createRun()                 → reconciliation_runs
        ├─ load pools                  → invoices/payments/notes
        ├─ Candidate Retrieval (pgvector)
        ├─ Evidence Builder            → EvidenceSignal[]
        ├─ Rule Engine                 → status (decisión determinística)
        ├─ Confidence                  → score trazable
        ├─ AI Explanation (opcional)   → explanation / suggestedAction
        ├─ saveResults(runId)          → reconciliations (+ reconciliation_payments)
        └─ finishRun()
        │
        ▼
   Human Review Workspace (lee resultados persistidos)
```

## Principios
- IA para **enriquecer**, no decidir.
- Reglas **determinísticas** y trazables.
- Evidencia y decisiones **persistentes y auditables** (`signals`, `confidence`, `explanation`).
- Procesamiento **desacoplado** vía pg-boss (preparado para escalar a más colas/workers).
- Arquitectura preparada para **múltiples fuentes** de datos sin tocar el motor.

## Referencias
- Modelo de datos: [`Modelo-Conceptual-Base-Datos.md`](./Modelo-Conceptual-Base-Datos.md)
  (tablas `reconciliations`, `reconciliation_runs`, `reconciliation_payments`).
- Motor determinístico: [`server/services/reconciliation/engine.ts`](../../server/services/reconciliation/engine.ts).
- Repositorios: [`server/repositories/`](../../server/repositories/).
- Cola: [`server/queue/boss.ts`](../../server/queue/boss.ts) y [`server/plugins/queue.ts`](../../server/plugins/queue.ts).
```
