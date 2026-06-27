# Arquitectura General - AI Reconciliation Assistant

## Objetivo

Construir una aplicación de conciliación financiera asistida por IA que
demuestre el enfoque de un **AI Forward Deployed Engineer**.

La solución debe cumplir el reto y, además, mostrar una arquitectura
preparada para integrarse con procesos empresariales reales.

------------------------------------------------------------------------

# Principios

-   La IA **no toma decisiones financieras**.
-   La IA **enriquece la información**.
-   El motor de conciliación es determinístico.
-   Todas las decisiones son explicables.
-   La arquitectura es modular y fácilmente extensible.

------------------------------------------------------------------------

# Arquitectura General

``` text
                    Browser
                        │
                        ▼
                 Nuxt 3 Application
        ┌──────────────────────────────────────┐
        │                                      │
        │              UI / Pages              │
        │           Components                 │
        │           Composables                │
        │                                      │
        └─────────────────┬────────────────────┘
                          │
                          ▼
                  Nuxt Server API (Nitro)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼

 IngestionService   ReconciliationService   AIService

                          │
                          ▼

                   Domain Services

        ┌──────────────┼───────────────┐
        │              │               │

        ▼              ▼               ▼

 Invoice Pool   Payment Pool   Notes Pool

                          │
                          ▼

                PostgreSQL + pgvector
```

------------------------------------------------------------------------

# Flujo General

``` text
CSV
PDF
Imagen
CRUD Manual

        │
        ▼

Ingestion Layer

        │
        ▼

Normalización

        │
        ▼

Knowledge Pools

        │
        ▼

Evidence Retrieval

        │
        ▼

Rule Engine

        │
        ▼

Confidence Score

        │
        ▼

AI Explanation

        │
        ▼

Human Review
```

------------------------------------------------------------------------

# Frontend (Nuxt)

El frontend será una única aplicación Nuxt 3.

Secciones principales:

-   Dashboard
-   Facturas
-   Pagos
-   Notas
-   Conciliaciones

La UI únicamente consume los endpoints internos de Nuxt Server.

------------------------------------------------------------------------

# Server API

Toda la lógica vive en Nitro.

## Facturas

    POST /api/invoices
    GET  /api/invoices
    DELETE /api/invoices/:id

## Pagos

    POST /api/payments
    GET  /api/payments
    DELETE /api/payments/:id

## Notas

    POST /api/notes
    GET  /api/notes
    DELETE /api/notes/:id

## Importación masiva

    POST /api/import/invoices
    POST /api/import/payments
    POST /api/import/notes

## Bonus

    POST /api/import/invoice-pdf
    POST /api/import/invoice-image

## Conciliación

    POST /api/reconciliation/run

    GET /api/reconciliation

    GET /api/reconciliation/:id

------------------------------------------------------------------------

# Knowledge Pools

Cada fuente mantiene su propio pool.

## Invoice Pool

Contiene únicamente facturas normalizadas.

Puede recibir información desde:

-   CSV
-   OCR
-   Imagen
-   CRUD

------------------------------------------------------------------------

## Payment Pool

Contiene pagos normalizados.

Puede recibir información desde:

-   CSV
-   CRUD

------------------------------------------------------------------------

## Notes Pool

Contiene notas operativas.

Puede recibir información desde:

-   JSON
-   CRUD

------------------------------------------------------------------------

# Base de Datos

PostgreSQL será la fuente de verdad.

Tablas principales:

-   invoices
-   payments
-   notes
-   reconciliations

Cada entidad almacena también un embedding para búsquedas semánticas
mediante pgvector.

------------------------------------------------------------------------

# AI Layer

La IA únicamente participa en tareas de enriquecimiento.

Responsabilidades:

-   OCR
-   Extracción estructurada
-   Interpretación de notas
-   Normalización de proveedores
-   Generación de explicaciones
-   Sugerencia de siguiente acción

Nunca decide la conciliación.

------------------------------------------------------------------------

# Evidence Retrieval

Antes de conciliar una factura se recupera evidencia.

Fuentes de evidencia:

-   Invoice ID
-   PO Number
-   Vendor Similarity
-   Payment Reference
-   Amount
-   Currency
-   Notas
-   Embeddings (pgvector)

La búsqueda vectorial únicamente recupera candidatos.

------------------------------------------------------------------------

# Motor de Conciliación

El motor aplica reglas determinísticas.

Estados posibles:

-   Matched
-   Partial Match
-   Needs Review
-   Unmatched
-   Suspicious

Cada decisión genera:

-   confidence
-   evidencia utilizada
-   explicación
-   siguiente acción

------------------------------------------------------------------------

# Flujo de Conciliación

``` text
Invoice

↓

Retrieve Candidate Payments
(pgvector)

↓

Retrieve Notes

↓

Build Evidence

↓

Rule Engine

↓

Confidence

↓

AI Explanation

↓

Save Reconciliation
```

------------------------------------------------------------------------

# Worker

El proceso de conciliación está desacoplado de la ingesta.

``` text
Importación

↓

Persistencia

↓

Reconciliation Worker

↓

Resultados
```

Para este reto puede ejecutarse inmediatamente tras cada importación,
dejando la arquitectura preparada para ejecutarse posteriormente
mediante una cola (Redis Streams, SQS, RabbitMQ, etc.).

------------------------------------------------------------------------

# Estructura del Proyecto

``` text
app/

server/
    api/
    services/
    repositories/

domain/
    invoice/
    payment/
    reconciliation/
    notes/

components/

composables/

prisma/

data/

samples/
```

------------------------------------------------------------------------

# Objetivo Arquitectónico

La aplicación debe transmitir que fue diseñada como un sistema
empresarial donde:

-   múltiples fuentes alimentan un mismo dominio;
-   la IA enriquece la información;
-   la conciliación sigue siendo determinística;
-   todas las decisiones son auditables;
-   el sistema puede crecer incorporando nuevas fuentes sin modificar el
    motor de negocio.
