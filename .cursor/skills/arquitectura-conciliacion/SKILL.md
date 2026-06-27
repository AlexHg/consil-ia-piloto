---
name: arquitectura-conciliacion
description: >-
  Arquitectura del AI Reconciliation Assistant (Nuxt 3 + Nitro + PostgreSQL/pgvector).
  Define principios, capas, contratos de API, modelo de dominio, pools de conocimiento,
  motor determinístico de conciliación y rol de la IA. Úsalo al crear o modificar
  endpoints, services, repositories, dominio, ingesta, evidencia o el motor de
  conciliación; o cuando se hable de facturas, pagos, notas, conciliaciones,
  matching, confidence o embeddings.
---

# Arquitectura — AI Reconciliation Assistant

Plataforma de conciliación financiera asistida por IA que demuestra el enfoque de un **AI Forward Deployed Engineer**: múltiples fuentes alimentan un mismo dominio, la IA enriquece la información y la conciliación sigue siendo determinística y auditable.

## Principios (no negociables)

- La IA **no toma decisiones financieras**; solo **enriquece** información.
- El **motor de conciliación es determinístico** (reglas, no IA).
- Toda decisión es **explicable y auditable**.
- La arquitectura es **modular y extensible**: agregar una nueva fuente no debe modificar el motor de negocio.

Si una propuesta hace que la IA decida un match, viola la arquitectura: rechazarla y proponer la alternativa determinística.

## Capas

```
Browser → Nuxt 3 (UI/Pages/Components/Composables)
        → Nuxt Server API (Nitro)
        → IngestionService · ReconciliationService · AIService
        → Domain Services
        → Invoice Pool · Payment Pool · Notes Pool
        → PostgreSQL + pgvector
```

La UI **solo** consume endpoints internos de Nitro. Toda la lógica de negocio vive en `server/`.

## Estructura del proyecto

| Carpeta | Responsabilidad |
|---|---|
| `app/` | Frontend Nuxt: pages, components, composables. Solo consume `/api/*`. |
| `server/api/` | Endpoints Nitro (controllers delgados). |
| `server/services/` | Lógica de aplicación: `ingestion/`, `reconciliation/`, `evidence/`, `ai/`. |
| `server/repositories/` | Acceso a datos (PostgreSQL). |
| `server/db/` | Init SQL y extensiones (incluye `pgvector`). |
| `shared/types/domain.ts` | Modelo de dominio canónico (fuente de verdad de tipos). |
| `data/samples/` | Datos de ejemplo (CSV, etc.). |

Mantén los controllers de `server/api/` delgados: validan input y delegan en services. La lógica de negocio nunca vive en el endpoint.

## Modelo de dominio

Definido en `shared/types/domain.ts`. **Toda fuente** (CSV, JSON, PDF, imagen, alta manual) se normaliza a estas entidades; el motor nunca conoce el origen.

- `Invoice`, `Payment`, `OperationalNote`
- `ReconciliationStatus`: `Matched | Partial Match | Needs Review | Unmatched | Suspicious`
- `EvidenceSignal`: señal explicable con `weight` y `matched`.
- `ReconciliationResult`: `{ invoiceId, matchedPaymentIds, status, confidence, remainingBalance, suggestedAction, explanation, signals }`.

Antes de crear tipos nuevos, revisa y reutiliza los de `domain.ts`. Si extiendes el modelo, hazlo ahí.

## Contratos de API (Nitro)

Convención de archivos: `server/api/<recurso>.<método>.ts` (p.ej. `health.get.ts`).

| Recurso | Endpoints |
|---|---|
| Facturas | `POST/GET /api/invoices`, `DELETE /api/invoices/:id` |
| Pagos | `POST/GET /api/payments`, `DELETE /api/payments/:id` |
| Notas | `POST/GET /api/notes`, `DELETE /api/notes/:id` |
| Importación | `POST /api/import/{invoices,payments,notes}` |
| Bonus (OCR/IA) | `POST /api/import/invoice-pdf`, `POST /api/import/invoice-image` |
| Conciliación | `POST /api/reconciliation/run`, `GET /api/reconciliation`, `GET /api/reconciliation/:id` |

## Knowledge Pools

Cada fuente mantiene su propio pool con datos **ya normalizados**:

- **Invoice Pool** ← CSV, OCR, imagen, CRUD
- **Payment Pool** ← CSV, CRUD
- **Notes Pool** ← JSON, CRUD

## Base de datos

PostgreSQL es la fuente de verdad. Tablas: `invoices`, `payments`, `notes`, `reconciliations`. Cada entidad guarda un **embedding** para búsqueda semántica vía `pgvector`.

## Capa de IA (solo enriquecimiento)

Responsabilidades: OCR, extracción estructurada, interpretación de notas, normalización de proveedores, generación de explicaciones y sugerencia de siguiente acción. **Nunca decide la conciliación.**

## Evidence Retrieval

Antes de conciliar una factura se recupera evidencia. La búsqueda vectorial (`pgvector`) **solo recupera candidatos**; las reglas deciden.

Fuentes de evidencia: Invoice ID, PO Number, Vendor Similarity, Payment Reference, Amount, Currency, Notas, Embeddings.

## Motor de conciliación (determinístico)

Flujo por factura:

```
Invoice
 → Retrieve Candidate Payments (pgvector)
 → Retrieve Notes
 → Build Evidence (EvidenceSignal[])
 → Rule Engine → ReconciliationStatus
 → Confidence Score
 → AI Explanation (enriquecimiento)
 → Save Reconciliation
```

Cada decisión genera: `confidence`, evidencia utilizada (`signals`), `explanation` y `suggestedAction`.

## Worker

La conciliación está **desacoplada** de la ingesta:

```
Importación → Persistencia → Reconciliation Worker → Resultados
```

Para el reto puede ejecutarse inmediatamente tras cada importación, pero el diseño debe quedar preparado para una cola (Redis Streams, SQS, RabbitMQ).

## Checklist al implementar

- [ ] ¿La IA solo enriquece y el match lo deciden reglas?
- [ ] ¿Los datos se normalizan al modelo de `shared/types/domain.ts`?
- [ ] ¿El endpoint es delgado y la lógica vive en un service?
- [ ] ¿La decisión es auditable (`signals` + `explanation` + `confidence`)?
- [ ] ¿Agregar la fuente nueva NO obligó a tocar el motor?

## Referencia completa

Para el detalle original, ver [.knowledge/docs/Arquitectura_AI_Reconciliation_Assistant.md](../../../.knowledge/docs/Arquitectura_AI_Reconciliation_Assistant.md).
