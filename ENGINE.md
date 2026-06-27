# ENGINE — Arquitectura de IA para Conciliación

Este documento describe la **arquitectura del motor de conciliación asistido por IA**: cómo
las facturas se concilian contra los pagos, qué parte es determinística, dónde interviene la
IA y por qué cada decisión es **explicable, auditable y reproducible**.

Es el complemento técnico del [`README.md`](./README.md): el README explica cómo correr la app;
este documento explica **cómo piensa el motor**.

---

## 1. Principio rector

> **La IA enriquece. Las reglas deciden.**

| Capa | Responsabilidad | ¿Decide el match? |
|---|---|---|
| Motor de conciliación (`engine.ts`) | Aplica reglas sobre la evidencia y produce el estado | **Sí — 100% determinístico** |
| Evidence Retrieval (`retrieval.ts`) | Recupera y ordena candidatos (pgvector) | No — solo recupera |
| Capa de IA (`ai/`) | Embeddings, interpretación de notas, redacción de explicaciones | **Nunca** |

Consecuencias de diseño, no negociables:

- La IA **nunca** altera `status`, `confidence` ni `matchedPaymentIds`.
- Toda llamada a la IA tiene **fallback determinístico**: el sistema es correcto aunque la IA
  esté apagada o falle.
- La búsqueda vectorial **solo recupera candidatos**; el conjunto que llega al motor es lo
  bastante amplio para que la decisión sea **idéntica** con IA real o con el proveedor mock.

Si una propuesta hace que la IA decida un match, viola la arquitectura.

---

## 2. Modelo de dominio (fuente de verdad)

Definido en [`shared/types/domain.ts`](./shared/types/domain.ts). **Toda fuente** (CSV, JSON,
alta manual, OCR futuro) se normaliza a estas entidades; el motor nunca conoce el origen.

- `Invoice`, `Payment`, `OperationalNote`
- `ReconciliationStatus`: `Matched | Partial Match | Needs Review | Unmatched | Suspicious`
- `EvidenceSignal`: señal explicable con `key`, `label`, `weight`, `matched`, `detail`.
- `ReconciliationResult`: salida auditable por factura
  (`{ invoiceId, matchedPaymentIds, status, confidence, remainingBalance, suggestedAction, explanation, signals }`).
- `ReconciliationRunStatus`, `ReconciliationSummary`: estado de corrida y KPIs para la UI.
- `ReviewAction` / `ReconciliationReviewResult`: decisión humana auditada.

---

## 3. Pipeline asíncrono (visión global)

La conciliación está **desacoplada** de la ingesta mediante una cola
[`pg-boss`](./server/queue/boss.ts) que vive en la misma base de datos (esquema `pgboss`), sin
añadir Redis/SQS.

```
Importación / Alta manual
   → Persistencia (pools en PostgreSQL)
   → cola: enrichment            (IA, fuera del camino crítico)
        → embeddings (invoices, payments, notes)
        → interpretación de notas (resumen + IDs)
   → cola: reconciliation        (motor determinístico)
        → Evidence Retrieval (pgvector recupera candidatos)
        → Rule Engine        (decide estado + confidence)
        → señal semántica    (informativa, weight 0)
        → AI Explanation     (post-decisión, no altera nada)
        → Persistencia auditable
   → Resultados visibles en el dashboard
```

- El productor (`enqueueEnrichment` / `enqueueReconciliation`) usa `sendDebounced` para
  **colapsar ráfagas** (varias importaciones seguidas → una sola corrida).
- El worker de enriquecimiento **encadena** la conciliación al terminar; si la IA falla,
  igualmente concilia (`finally`), porque el motor degrada con elegancia.
- Encolar nunca tumba la request de ingesta: los errores de cola se loguean y se continúa.

Wiring en [`server/plugins/queue.ts`](./server/plugins/queue.ts): al arrancar registra ambos
workers y, si no hay resultados previos, encola una corrida inicial tras el `db:seed`.

---

## 4. Evidence Retrieval (recuperación de candidatos)

Archivo: [`server/services/evidence/retrieval.ts`](./server/services/evidence/retrieval.ts).

- Para cada factura recupera **pagos candidatos** y **notas relacionadas** ordenados por
  similitud coseno (`<=>`) usando índices **HNSW** de `pgvector`.
- Límites generosos (`K=50` pagos, `K=20` notas): pgvector **ordena y puntúa**, pero entrega
  un conjunto amplio para no descartar coincidencias deterministas (referencia/monto).
- **Fallback sin embeddings:** si la factura aún no tiene `embedding` (la IA no ha corrido, o
  proveedor mock antes de procesar), devuelve **todos** los registros con `similarity: 0`. Así
  la decisión del motor es la misma; la calidad del embedding solo afecta el orden y la señal
  semántica informativa.

La similitud se acota a `[0,1]` (`clampSimilarity`) por seguridad ante el driver de PG.

---

## 5. Motor determinístico (el corazón)

Archivo: [`server/services/reconciliation/engine.ts`](./server/services/reconciliation/engine.ts).
**No importa ningún módulo de IA.** Procesa factura por factura.

### 5.1 Selección de candidatos

1. **Por referencia (señal más fuerte).** Pagos cuya `reference` contenga el ID de factura, el
   PO o sus dígitos (`referenceMatches`). Tolera typos en el nombre del proveedor.
2. **Por monto + proveedor (si no hay referencia).** Pagos con monto igual (±`0.01`) **y**
   `vendorSimilarity ≥ 0.5`. La similitud de proveedor normaliza sufijos corporativos
   (`LLC, SA, Inc, Ltd, Co, Corp, Services…`) y compara tokens (Jaccard sobre el máximo).

### 5.2 Señales y `confidence`

El `confidence` es la **suma ponderada de las señales que coinciden**, acotado a `[0, 0.99]`:

| Señal (`key`) | Peso | Coincide cuando |
|---|---|---|
| `reference` | **0.45** | Hubo candidatos por referencia |
| `amount` | **0.30** exacto / **0.12** parcial | Pagado = monto (±0.01) / pagado < monto |
| `currency` | **0.10** | Todos los pagos vinculados comparten la moneda de la factura |
| `vendor` | **0.15** | Mejor `vendorSimilarity ≥ 0.5` |
| `semantic` | **0** (informativa) | Añadida post-motor con la mejor similitud pgvector |

La señal `semantic` se agrega en [`service.ts`](./server/services/reconciliation/service.ts)
(`appendSemanticSignal`) con `weight: 0` para **dejar la evidencia vectorial auditada sin
afectar** el `confidence` ya calculado.

### 5.3 Clasificación de estado

En orden de evaluación:

| Estado | Condición | Acción sugerida |
|---|---|---|
| `Unmatched` | Sin candidatos | Buscar pago o registrar la diferencia |
| `Suspicious` | Moneda distinta a la factura | Revisar manualmente la moneda |
| `Suspicious` | Posible duplicado (varios pagos exceden el total) | Verificar antes de cerrar |
| `Matched` | Monto exacto **y** `confidence ≥ 0.9` | Listo para aprobar |
| `Partial Match` | El pago cubre solo parte del monto | Saldo pendiente calculado |
| `Needs Review` | Coincidencia probable | Confirmar manualmente |

### 5.4 Salida

Cada factura produce un `ReconciliationResult` con `matchedPaymentIds`, `status`, `confidence`,
`remainingBalance`, `suggestedAction`, una `explanation` de plantilla y el detalle de `signals`.
Las notas relacionadas se detectan por ID/PO/similitud y se mencionan en la explicación.

---

## 6. Capa de IA (solo enriquecimiento)

Directorio: [`server/services/ai/`](./server/services/ai). Dos implementaciones intercambiables
tras la interfaz `AIProvider` ([`provider.ts`](./server/services/ai/provider.ts)):

- **`OpenAIProvider`** (`isLive: true`): embeddings (`/embeddings`) y chat (`/chat/completions`)
  vía `fetch`. Requiere `OPENAI_API_KEY`.
- **`MockProvider`** (`isLive: false`): determinístico y sin red. Genera embeddings estables a
  partir de un hash del texto (FNV-1a → mulberry32 → vector normalizado), de modo que el mismo
  texto produce siempre el mismo vector → **resultados reproducibles** sin credenciales.

`useAI()` cachea el proveedor en `globalThis` y lo recrea si cambia la presencia de la API key
(útil en dev al editar `.env`). Config centralizada en [`config.ts`](./server/services/ai/config.ts):
`OPENAI_MODEL` (def. `gpt-4o-mini`), `OPENAI_EMBEDDING_MODEL` (def. `text-embedding-3-small`).

### Funciones de IA

- **Embeddings** ([`embeddings.ts`](./server/services/ai/embeddings.ts) +
  [`enrichment.ts`](./server/services/ai/enrichment.ts)): serializa cada entidad a un texto
  canónico estable y persiste el vector (`vector(1536)`). Idempotente y por lotes (64); ningún
  fallo de IA se propaga.
- **Interpretación de notas** (`interpretNote` en [`enrich.ts`](./server/services/ai/enrich.ts)):
  resumen + IDs referenciados. La extracción por **regex** (`INV-`, `PAY-`, `PO-`) es la base
  determinística; la IA solo añade el resumen e IDs extra.
- **Explicaciones** (`enrichExplanation`): reescribe en lenguaje natural la explicación de una
  conciliación **ya decidida**, alimentando al modelo solo con la evidencia y la decisión. Si la
  IA no está o falla, devuelve la **plantilla determinística** del motor.

---

## 7. Persistencia y auditoría

PostgreSQL es la fuente de verdad. Esquema en
[`server/db/migrations/0000_initial_schema.ts`](./server/db/migrations/0000_initial_schema.ts):

| Tabla | Rol |
|---|---|
| `invoices`, `payments`, `notes` | Pools normalizados; cada uno con `embedding vector(1536)` (índice HNSW coseno) |
| `reconciliation_runs` | Cabecera de cada corrida (trigger, conteo, timestamps) |
| `reconciliations` | Resultado por factura (estado, `confidence`, `signals` jsonb, explicación) |
| `reconciliation_payments` | Relación N:M factura↔pago |
| `reconciliation_reviews` | **Audit trail append-only** de decisiones humanas |

El [`reconciliations.repository.ts`](./server/repositories/reconciliations.repository.ts) guarda
cada corrida en una **transacción** (cabecera + pagos vinculados). `listReconciliations` usa
`DISTINCT ON (invoice_id)` para devolver siempre la conciliación más reciente.

**Revisión humana** (`reviewLatestReconciliation`): `accept → Matched`, `correct → Needs Review`.
La transacción actualiza el estado **y** registra en `reconciliation_reviews` (actor, acción,
estado previo/nuevo, comentario, fecha). El motor decide; el humano confirma o corrige; la IA no
interviene. El borrado de entidades limpia conciliaciones en cascada (`ON DELETE CASCADE`).

---

## 8. Contratos de API (Nitro)

```text
POST /api/reconciliation/run                 # encola una corrida (no bloquea)
GET  /api/reconciliation                     # último resultado por factura
GET  /api/reconciliation/summary             # KPIs agregados (Mission Control)
GET  /api/reconciliation/status              # estado de la corrida (polling de la UI)
POST /api/reconciliation/:invoiceId/review   # decisión humana (accept | correct)
```

Los controllers de `server/api/` son **delgados**: validan input y delegan en services. La
lógica de negocio vive en `server/services/`.

---

## 9. Garantías de calidad

- **Reproducibilidad:** con el mock, embeddings y candidatos son estables → la misma entrada
  produce el mismo resultado.
- **Robustez:** la conciliación funciona aunque la IA esté apagada (fallback en retrieval,
  interpretación y explicación).
- **Auditabilidad:** cada decisión expone sus `signals`, su `confidence` y su `explanation`; cada
  revisión humana queda en un audit trail append-only.
- **Extensibilidad:** agregar una nueva fuente solo requiere un normalizador en `ingestion/`; el
  motor **no se toca**.

## 10. Checklist al modificar el motor o la IA

- [ ] ¿La IA solo enriquece y el match lo deciden las reglas?
- [ ] ¿Los datos se normalizan al modelo de `shared/types/domain.ts`?
- [ ] ¿El endpoint es delgado y la lógica vive en un service?
- [ ] ¿La decisión es auditable (`signals` + `explanation` + `confidence`)?
- [ ] ¿Hay fallback determinístico para toda llamada de IA?
- [ ] ¿Agregar la fuente nueva NO obligó a tocar `engine.ts`?
