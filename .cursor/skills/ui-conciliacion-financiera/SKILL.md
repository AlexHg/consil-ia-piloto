---
name: ui-conciliacion-financiera
description: Sistema de diseño UI/UX para la plataforma SaaS de conciliación financiera asistida por IA (Nuxt + Tailwind + Nuxt UI). Define estilo enterprise premium, tokens de color, tipografía, layout basado en cards, componentes y patrones. Úsalo al crear o modificar cualquier pantalla, componente, layout o estilo del frontend de conciliación.
---

# UI/UX — Conciliación de Documentos Financieros

Sistema de diseño para una plataforma SaaS de conciliación financiera asistida por IA. Concepto rector: **Mission Control para la conciliación financiera impulsada por IA.**

La interfaz debe sentirse como un producto fintech moderno (Stripe Dashboard, Linear, Ramp, Mercury, Vercel, Notion por limpieza), **nunca** como un ERP pesado (SAP, Oracle, Dynamics).

## Stack

Nuxt + Tailwind + Nuxt UI. Para componentes Nuxt UI consulta el MCP `user-nuxt-ui` antes de inventar markup. Iconos: Lucide (estilo outline).

## Referencias visuales (leer SIEMPRE antes de diseñar)

Lee estas imágenes con la herramienta Read al iniciar trabajo visual:

- `.knowledge/inspiration/look-and-feel.jpeg` — look & feel global: dashboard verde/teal, sidebar limpia, gráficos suaves, cards con mucho aire.
- `.knowledge/inspiration/components.jpeg` — biblioteca de componentes: cards de balance, listas de transacciones, badges de estado, tarjetas con KPIs.

Especificación completa en `.knowledge/docs/UI-UX-Conciliacion-Financiera.md`.

## Principios

- Confianza, precisión, velocidad, automatización. La IA trabaja en segundo plano.
- El usuario nunca se siente saturado. Mucho espacio en blanco.
- Cada pantalla tiene **un solo foco**. Cada card representa **un concepto**.
- El usuario solo interviene en excepciones.

## Tokens de diseño

### Color

| Rol | Valor | Uso |
|-----|-------|-----|
| Fondo | `#FAFAFA` | Fondo de app |
| Cards | Blanco puro | Superficies |
| Bordes | Gris muy claro | Separadores |
| Sombras | Suaves y amplias | Elevación ligera |
| Primario | Verde esmeralda / Teal | Estados correctos, progreso, acciones principales, conciliaciones exitosas |
| Secundario | Ámbar | Pendientes, revisión manual, sugerencias de IA |
| Error | Rojo | **Solo errores reales**, nunca decorativo |

Prioriza tamaño, peso y espacio **antes** que color.

### Tipografía

Fuente: Inter / Geist / SF Pro / Plus Jakarta.

| Nivel | Tamaño |
|-------|--------|
| Título | 32–40 px |
| Secciones | 20–24 px |
| Cards | 16–18 px |
| Contenido | 14–15 px |
| Metadata | 12 px |

### Espaciado y forma

- Cards grandes. Border radius: `20–24 px`. Padding: `24–32 px`.
- Mucho espacio entre componentes. Nada apretado.

### Animaciones

Hover suave, fade, elevación ligera de cards. Evitar animaciones llamativas.

## Estados

- 🟢 Conciliado (verde)
- 🟡 Pendiente (ámbar)
- 🔴 Error (rojo)
- 🔵 Procesando (azul)

Usar badges tipo pill, igual que en `components.jpeg` (`Paid`, `Pending`, `Due Date`).

## Layout

Dashboard basado en **cards**, no en tablas. Sidebar izquierda muy limpia.

Secciones del sidebar: Dashboard · Pools · Conciliación · Documentos · Resultados · Reglas · IA · Configuración.

### Dashboard principal

Información ejecutiva en cards (evitar tablas). Ejemplos de cards:

- Pool Bancario — 4,521 movimientos
- Pool ERP — 4,487 registros
- Pool Facturas — 4,430 documentos
- IA — 96.8% conciliado automáticamente
- Pendientes — 48 casos
- Conciliaciones hoy — 3,241
- Tiempo promedio — 2.3 segundos

Gráficos: líneas suaves, áreas con degradados ligeros. Sin 3D, sin colores saturados.

### Pools

Cada origen de datos tiene su pool (Bancario, ERP, Facturas), misma estructura: Registros · Última sincronización · Estado · Botón "Entrar".

### Pantalla de conciliación

Debe sentirse como una IA trabajando. Flujo vertical:

```
Movimiento Bancario → IA Analizando (Confianza: 98%) → Registro ERP → Factura PDF → Conciliado
```

### Panel de IA (siempre visible)

Muestra: conciliaciones en proceso · última decisión · nivel de confianza · reglas utilizadas · aprendizajes recientes.

### Detalle de conciliación

Tres columnas: **Izquierda** Movimiento bancario · **Centro** Registro ERP · **Derecha** Factura PDF.

Abajo, bloque **Explicación IA** (estilo cita) con los motivos (mismo monto, diferencia de fecha, referencia coincidente, proveedor similar) y nivel de confianza. Acciones: **Aceptar** / **Corregir**.

### Upload

Tres zonas independientes (Estado Bancario · ERP · Facturas), cada una con drag & drop, barra de progreso y estado de procesamiento.

## Checklist antes de entregar UI

- [ ] Leíste las dos imágenes de `.knowledge/inspiration/`
- [ ] Fondo `#FAFAFA`, cards blancas, bordes gris claro, sombras suaves
- [ ] Verde/teal solo para éxito/acción; ámbar para pendiente/IA; rojo solo errores
- [ ] Radius 20–24px, padding 24–32px, mucho espacio en blanco
- [ ] Cards en lugar de tablas; un solo foco por pantalla
- [ ] Iconos Lucide outline
- [ ] Componentes vía Nuxt UI (MCP `user-nuxt-ui`) cuando aplique
