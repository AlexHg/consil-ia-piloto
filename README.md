# AI Reconciliation Assistant

Asistente de conciliación financiera (facturas ↔ pagos) asistido por IA para un equipo de back-office.

La conciliación es **determinística** (reglas + señales explicables). La IA solo aporta evidencia, interpreta notas operativas y genera explicaciones en lenguaje natural; **nunca decide** la conciliación.

## Stack

- **Nuxt 4** (full-stack: UI + API vía Nitro)
- **Nuxt UI v4** + **Tailwind CSS v4** (dashboard)
- **PostgreSQL + pgvector** (persistencia y recuperación de candidatos por similitud)
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

# 4. Servidor de desarrollo (http://localhost:3000)
pnpm dev
```

Healthcheck de la API: `GET http://localhost:3000/api/health`.

## Estructura del proyecto

```text
app/                      # Frontend Nuxt (dashboard)
server/
  api/                    # Endpoints REST (Nitro)
  services/
    ingestion/            # Parsers CSV/JSON/PDF -> modelo interno
    evidence/             # Recuperación de evidencia (exacta + similitud)
    reconciliation/       # Motor determinístico de conciliación
    ai/                   # Explicaciones / interpretación de notas / OCR (interfaz)
  repositories/           # Acceso a datos (pools de Invoices/Payments/Notes)
  db/
    init/                 # Scripts de init de Postgres (extensión pgvector)
shared/
  types/                  # Modelo de dominio compartido (Invoice, Payment, Note...)
data/
  samples/                # Datos de muestra del reto (invoices.csv, payments.csv, notes.json)
```

## Estado

Base del proyecto inicializada: scaffold Nuxt 4, UI, base de datos con pgvector, modelo de dominio y datos de muestra. Los módulos de ingesta, evidencia, motor de conciliación y servicios de IA se implementarán a continuación.
