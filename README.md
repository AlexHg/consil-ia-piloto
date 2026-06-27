# AI Reconciliation Assistant

Asistente de conciliación financiera (facturas ↔ pagos) asistido por IA para un equipo de back-office.

La conciliación es **determinística** (reglas + señales explicables). La IA solo aporta evidencia semántica, interpreta notas operativas y redacta explicaciones en lenguaje natural; **nunca decide** la conciliación.

> Reto: *AI / Forward Deploy Engineer — Take Home Assessment*. Esta solución cubre el **core** (cargar datos, hacer matching, clasificar, explicar, mostrar resultados) y varios **bonus** (UI web, REST API, base de datos, integración LLM con fallback, revisión manual y audit trail).

## Stack

- **Nuxt 4** (full-stack: UI + API vía Nitro)
- **Nuxt UI v4** + **Tailwind CSS v4** (dashboard)
- **PostgreSQL + pgvector** vía **Kysely** (persistencia y recuperación de candidatos por similitud)
- **pg-boss** (cola de trabajos sobre la misma base de datos: enriquecimiento + conciliación asíncronos)
- **OpenAI** opcional (embeddings y explicaciones); si no hay API key se usa un proveedor *mock* determinístico
- **Docker Compose** (base de datos)

## Requisitos

- Node.js 20.19+
- pnpm 9 (`npm i -g pnpm@9`)
- Docker (para la base de datos)

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Base de datos (Postgres + pgvector)
docker compose up -d

# 3. Dependencias
pnpm install

# 4. Esquema y datos de muestra
pnpm db:migrate
pnpm db:seed

# 5. Servidor de desarrollo (http://localhost:3000)
pnpm dev
```

Healthcheck de la API: `GET http://localhost:3000/api/health`.

Tras `pnpm db:seed`, abre el dashboard y pulsa **Ejecutar conciliación** para correr el motor sobre los datos de muestra.

### IA: real o mock

La IA es **opcional**. Sin `OPENAI_API_KEY` el sistema funciona end-to-end con un proveedor *mock*: genera embeddings deterministas (para la recuperación de candidatos) y usa explicaciones de plantilla. Para activar la IA real, define en `.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

No se commitean secretos: la clave vive solo en `.env` (ignorado por git).

## Cómo funciona el matching

El motor (`server/services/reconciliation/engine.ts`) es **100% determinístico** y procesa factura por factura:

1. **Candidatos por referencia.** Busca pagos cuya `reference` contenga el ID de factura, el PO o sus dígitos (tolera typos en el nombre del proveedor). Es la señal más fuerte.
2. **Candidatos por monto + proveedor.** Si no hay referencia, considera pagos con monto igual (±0.01) y similitud de proveedor ≥ 50% (normalizando sufijos como *LLC, SA, Services*).
3. **Señales explicables.** Cada resultado acumula un `confidence` como suma ponderada de señales: referencia (0.45), monto exacto (0.30) o parcial (0.12), moneda (0.10) y proveedor (0.15).
4. **Clasificación de estado:**
   - `Unmatched` — sin candidatos.
   - `Suspicious` — moneda distinta a la factura, o posible pago duplicado (varios pagos que exceden el total).
   - `Matched` — monto exacto y `confidence` ≥ 0.9.
   - `Partial Match` — el pago cubre solo parte del monto (calcula el saldo pendiente).
   - `Needs Review` — coincidencia probable que requiere confirmación humana.
5. **Salida por factura:** `matchedPaymentIds`, `status`, `confidence`, `remainingBalance`, `suggestedAction`, `explanation` y el detalle de `signals`.

## Dónde se usa la IA

La IA **enriquece**, nunca decide:

- **Embeddings (pgvector):** recupera pagos y notas candidatos por similitud semántica antes de aplicar las reglas.
- **Interpretación de notas:** resume la nota y detecta los IDs de factura/pago que referencia (visible en el modal de detalle de cada nota).
- **Explicaciones:** reescribe en lenguaje natural la explicación del motor. Si la IA no está disponible, se usa la explicación de plantilla determinística como *fallback* seguro.

El pipeline es asíncrono (cola pg-boss): `ingesta → enriquecimiento (embeddings + notas) → conciliación determinística → persistencia`.

## Casos borde cubiertos (datos de muestra)

- Typo en el nombre del pagador con referencia y monto correctos → `Matched`.
- Pago parcial con saldo pendiente → `Partial Match`.
- Descuento/ajuste por pronto pago → `Needs Review` / `Partial Match` con nota relacionada.
- Pago en moneda distinta a la factura → `Suspicious`.
- Pago duplicado para la misma factura → `Suspicious`.
- Pago sin factura asociada → pago *huérfano* (`Unmatched`).

## Revisión humana y auditoría

Cada conciliación puede **aceptarse** o enviarse a **corrección** desde la pantalla *Conciliados*. Toda decisión queda registrada en `reconciliation_reviews` (audit trail: actor, acción, estado previo/nuevo, comentario y fecha). La decisión la toma el humano sobre el resultado del motor; la IA no interviene.

## API REST (Nitro)

```text
GET    /api/health

GET    /api/invoices            POST /api/invoices            DELETE /api/invoices/:id
GET    /api/payments            POST /api/payments            DELETE /api/payments/:id
GET    /api/notes               POST /api/notes               DELETE /api/notes/:id

POST   /api/import/invoices     POST /api/import/payments      POST /api/import/notes   (CSV o JSON)

POST   /api/reconciliation/run                 # encola una corrida
GET    /api/reconciliation                     # último resultado por factura
GET    /api/reconciliation/summary             # KPIs agregados
GET    /api/reconciliation/status              # estado de la corrida (polling)
POST   /api/reconciliation/:invoiceId/review   # decisión humana (accept | correct)
```

## Estructura del proyecto

```text
app/                      # Frontend Nuxt (dashboard)
  pages/                  # Dashboard, Facturas, Pagos, Notas, Conciliados
  components/             # Cards, formularios, modales de pool
  composables/            # usePools, useReconciliation, paginación, orden
server/
  api/                    # Endpoints REST (Nitro)
  services/
    ingestion/            # Normalización CSV/JSON + CRUD -> dominio
    evidence/             # Recuperación de candidatos (pgvector + reglas)
    reconciliation/       # Motor determinístico + orquestación + worker
    ai/                   # Proveedor (OpenAI/mock), embeddings, enriquecimiento
  repositories/           # Acceso a datos (Kysely) de los pools
  db/                     # Cliente, migraciones, seed, init pgvector
  queue/                  # Cola pg-boss
  plugins/                # Arranque de workers
shared/
  types/                  # Modelo de dominio compartido (Invoice, Payment, Note...)
data/
  samples/                # Datos de muestra del reto (invoices.csv, payments.csv, notes.json)
  extended/               # Dataset ampliado para demo
```

## Decisiones de diseño

- **Kysely en lugar de Prisma:** query builder tipado y ligero, con control total del SQL necesario para `pgvector` (operador `<=>`, índices HNSW).
- **Motor invoice-centric:** el estado vive en la conciliación de la factura; el estado de un pago es una proyección derivada (nunca diverge de la decisión determinística).
- **IA desacoplada:** toda llamada a la IA tiene *fallback* determinístico, de modo que el sistema es correcto y explicable aunque la IA esté apagada.

## Qué mejoraría con más tiempo

- **Tests automatizados** del motor y de los casos borde (hoy no incluidos; ver más abajo).
- **Ingesta de PDF/imagen (OCR)** para facturas escaneadas (fuera del alcance de este demo).
- Autenticación y multiusuario real (hoy el revisor se registra con un actor fijo).
- Cola gestionada (Redis Streams / SQS) para escalar el worker horizontalmente.
- Matching N:M más rico (un pago que cubre varias facturas) y aprendizaje de correcciones.

## Tests

Actualmente no hay tests automatizados. Por la naturaleza del dominio (decisiones financieras), el mayor retorno sería un set de **tests unitarios del motor determinístico** (`engine.ts`) cubriendo cada estado y caso borde con los datos de muestra. Es un *bonus* del reto y está pendiente.

## Scripts

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción
pnpm typecheck        # verificación de tipos (vue-tsc)
pnpm lint             # ESLint
pnpm db:migrate       # aplica migraciones
pnpm db:migrate:down  # revierte la última migración
pnpm db:seed          # carga datos de muestra
```
