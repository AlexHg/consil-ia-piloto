# Especificación de Arquitectura - AI Reconciliation Assistant

## Objetivo

Construir una plataforma de conciliación financiera asistida por IA, no únicamente un script que relacione CSVs.

El sistema debe cumplir completamente con los requerimientos del reto, pero además demostrar cómo diseñaría la solución un AI Forward Deployed Engineer para un entorno empresarial real.

La solución debe ser:

- Modular.
- Explicable.
- Determinística.
- Fácilmente extensible.
- Orientada a integración con sistemas reales.

La IA debe asistir el proceso, nunca sustituir las decisiones de negocio.

---

## Principios de diseño

1. La conciliación debe ser determinística.
2. La IA únicamente aporta evidencia, enriquecimiento y explicaciones.
3. Todas las decisiones deben ser auditables.
4. Cada componente debe poder reemplazarse sin afectar al resto.
5. El proyecto debe parecer una versión simplificada de un sistema de producción.

---

## Arquitectura General

```text
                Fuentes de Información
────────────────────────────────────────────────────
  CSV
  PDF
  Imagen
  CRUD Manual
        │
        ▼
  Capa de Ingesta
        │
        ▼
  Normalización + IA
        │
        ▼
  Pools de Información
        │
        ▼
  Capa de Recuperación de Evidencia
        │
        ▼
  Motor Determinístico de Conciliación
        │
        ▼
  Generación de Explicaciones IA
        │
        ▼
  Cola de Revisión Humana
```

---

## Módulos

### 1. Ingesta

El sistema debe aceptar información desde distintas fuentes.

Fuentes soportadas:

- Importación masiva de facturas CSV.
- Importación masiva de pagos CSV.
- Importación masiva de notas JSON.
- Alta manual mediante CRUD.
- (Bonus) Facturas PDF.
- (Bonus) Facturas como imagen.

Cada fuente debe transformarse al mismo modelo interno.

---

### 2. Normalización

Toda la información debe convertirse a entidades del dominio:

- `Invoice`
- `Payment`
- `OperationalNote`

Si el origen es PDF o imagen, utilizar OCR + IA para extraer los datos.

El motor de conciliación nunca debe conocer el origen de la información.

---

### 3. Pools de información

Mantener pools independientes.

- Invoices Pool
- Payments Pool
- Notes Pool

Cada pool debe permitir:

- Alta individual.
- Importación masiva.
- Consulta.
- Eliminación.

Estos pools son independientes del proceso de conciliación.

---

## Capa de Recuperación de Evidencia

Antes de intentar conciliar una factura, recuperar evidencia.

La evidencia puede provenir de distintas fuentes.

### Coincidencias exactas

- Invoice ID
- PO Number
- Currency
- Exact Amount

### Coincidencias aproximadas

- Similitud del proveedor.
- Similitud de referencias.
- Texto libre.

### Enriquecimiento mediante IA

Interpretar notas operativas.

Ejemplo:

```text
"Early payment discount"
        ↓
{
  "type": "discount",
  "amount": 10
}
```

### Base de datos vectorial (Bonus)

Utilizar embeddings para indexar:

- Facturas.
- Pagos.
- Notas.

La búsqueda vectorial solo debe servir para recuperar candidatos.

Nunca debe tomar la decisión final de conciliación.

---

## Motor de Conciliación

El motor debe ser completamente determinístico.

Debe generar uno de los siguientes estados:

- Matched
- Partial Match
- Needs Review
- Unmatched
- Suspicious

La decisión debe basarse en múltiples señales.

Ejemplo:

- Invoice ID
- PO
- Vendor Similarity
- Reference Similarity
- Amount
- Currency
- Evidencia obtenida mediante IA
- Pagos duplicados
- Descuentos
- Pagos parciales

---

## Confidence Score

Cada conciliación debe generar un score explicable.

Ejemplo:

```text
Invoice ID ............. +40
PO Match ............... +20
Vendor Similarity ...... +15
Amount ................. +15
Currency ............... +10
─────────────────────────────
Confidence = 100
```

El score debe poder justificarse.

---

## Responsabilidades de la IA

La IA nunca decide la conciliación.

La IA únicamente debe utilizarse para:

- OCR.
- Extracción estructurada.
- Normalización de proveedores.
- Interpretación de notas.
- Explicaciones en lenguaje natural.
- Sugerencia de siguiente acción.

---

## Worker de Conciliación

La conciliación debe ejecutarse como un proceso independiente de la ingesta.

Flujo:

```text
Importación
    ↓
Actualización de Pools
    ↓
Proceso de Conciliación
    ↓
Persistencia de Resultados
```

Para el reto puede ejecutarse de forma síncrona, pero la arquitectura debe dejar claro que está pensada para ejecutarse de forma asíncrona.

---

## Cola de Revisión

Las conciliaciones con incertidumbre deben quedar pendientes de revisión.

Estados futuros:

```text
Needs Review
    ↓
Approve
Reject
Merge
Duplicate
```

No es necesario implementar todo el flujo.

Solo dejar preparada la arquitectura.

---

## API REST

### Facturas

```http
POST   /invoices
GET    /invoices
DELETE /invoices/:id
```

### Pagos

```http
POST   /payments
GET    /payments
DELETE /payments/:id
```

### Notas

```http
POST   /notes
GET    /notes
DELETE /notes/:id
```

### Importaciones

```http
POST /imports/invoices
POST /imports/payments
POST /imports/notes
```

### Bonus

```http
POST /imports/invoice-pdf
POST /imports/invoice-image
```

### Conciliación

```http
POST /reconciliation/run
GET  /reconciliation
GET  /reconciliation/:invoiceId
```

---

## Interfaz

Crear un dashboard sencillo.

Secciones:

- Facturas.
- Pagos.
- Notas.
- Conciliación.

La vista de conciliación debe mostrar:

- Estado.
- Confidence.
- Evidencia utilizada.
- Explicación generada por IA.
- Acción sugerida.

---

## Uso de IA

Nunca enviar los CSV completos al modelo.

El modelo únicamente debe recibir evidencia estructurada.

Ejemplo:

```json
{
  "invoice": {},
  "candidatePayment": {},
  "evidence": {
    "vendorSimilarity": 0.94,
    "poMatch": true,
    "amountMatch": true,
    "discountDetected": true
  }
}
```

Respuesta esperada:

```json
{
  "explanation": "...",
  "suggestedAction": "...",
  "reasoning": [
    "..."
  ]
}
```

---

## Estructura del proyecto

```text
apps/
  api/
  web/
packages/
  reconciliation-engine/
  ai-services/
  shared/
data/
  samples/
```

---

## Tecnologías

| Capa            | Tecnología                            |
| --------------- | ------------------------------------- |
| Backend         | NestJS                                |
| Frontend        | Nuxt 3                                 |
| ORM             | Prisma                                |
| Base de datos   | PostgreSQL                            |
| Base vectorial  | pgvector                              |
| Validaciones    | Zod                                   |
| IA              | OpenAI SDK                            |
| OCR             | Servicio desacoplado mediante interfaz |

---

## Restricciones importantes

- No sobreingenierizar la solución.
- Priorizar calidad sobre cantidad de funcionalidades.
- Mantener el código limpio y fácil de explicar durante la entrevista.
- El evaluador debe identificar rápidamente una arquitectura propia de un AI Forward Deployed Engineer.

---

## Objetivo final

La solución debe transmitir que el candidato sabe construir sistemas empresariales donde:

- múltiples fuentes alimentan un mismo dominio,
- la IA enriquece la información,
- las decisiones siguen siendo determinísticas,
- existe trazabilidad completa,
- el sistema está preparado para crecer sin necesidad de rediseñarse.
