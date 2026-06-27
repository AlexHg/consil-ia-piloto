# Especificación de Diseño UI/UX

## Software de Conciliación de Documentos Financieros

# Objetivo

Diseñar una plataforma SaaS de conciliación financiera asistida por IA
con apariencia **enterprise premium**, minimalista y extremadamente
clara.

La sensación debe ser una mezcla entre:

-   Stripe Dashboard
-   Linear
-   Ramp
-   Mercury
-   Vercel
-   Notion (por limpieza)

Evitar interfaces pesadas tipo ERP (SAP, Oracle, Dynamics).

------------------------------------------------------------------------

# Filosofía

El sistema debe transmitir:

-   Confianza
-   Precisión
-   Velocidad
-   Automatización
-   IA trabajando en segundo plano

El usuario nunca debe sentirse saturado.

-   Mucho espacio en blanco.
-   Cada pantalla debe tener un solo foco.

------------------------------------------------------------------------

# Estilo Visual

Paleta tomada de la lámina `components.jpeg` (acento índigo, verde en positivos,
píldoras ámbar/rosa, fondo gris frío con cards blancas).

**Base**

-   Fondo: gris frío `#F4F5F8` (paneles/contenido)
-   Cards: Blanco puro
-   Bordes: Gris muy claro
-   Sombras: Muy suaves y amplias

**Color primario**

Índigo periwinkle `#4F67F0` (la card destacada tipo "Pay Now").

Es la **identidad de marca y la acción**. Usarlo para:

-   Acciones principales
-   Foco / selección
-   Marca
-   Métrica de IA (conciliación automática)

**Éxito (verde esmeralda)**

Reservado para lo positivo:

-   Conciliaciones exitosas
-   Progreso
-   Valores positivos

**Pendiente (ámbar)**

-   Pendientes
-   Revisión manual
-   Sugerencias de IA

**Apoyo (azul cielo)**

-   Acento del pool de pagos / elementos de soporte

**Error (rojo / rosa)**

Solo errores reales.

Nunca usarlo como elemento decorativo.

------------------------------------------------------------------------

# Tipografía

Fuentes recomendadas:

-   Inter
-   Geist
-   SF Pro
-   Plus Jakarta

Jerarquía:

-   Título: 32--40 px
-   Secciones: 20--24 px
-   Cards: 16--18 px
-   Contenido: 14--15 px
-   Metadata: 12 px

Priorizar tamaño, peso y espacio antes que color.

------------------------------------------------------------------------

# Layout

Dashboard basado en **cards**, no en tablas.

Cada card representa un concepto.

Ejemplo:

-   Pool Bancario
-   Pool ERP
-   Pool Facturas
-   IA Conciliando
-   Documentos Pendientes
-   Últimas Conciliaciones
-   Alertas
-   KPIs

Cada módulo es independiente.

------------------------------------------------------------------------

# Componentes

-   Cards grandes
-   Border radius: 20--24 px
-   Padding: 24--32 px
-   Mucho espacio entre componentes

Nada debe sentirse apretado.

------------------------------------------------------------------------

# Iconografía

Estilo outline.

Usar Lucide Icons.

Iconos frecuentes:

-   Documento
-   Banco
-   Factura
-   IA
-   Check
-   Warning
-   Search
-   Robot
-   Upload
-   Link

------------------------------------------------------------------------

# Navegación

Sidebar izquierda muy limpia.

Secciones:

-   Dashboard
-   Pools
-   Conciliación
-   Documentos
-   Resultados
-   Reglas
-   IA
-   Configuración

------------------------------------------------------------------------

# Dashboard Principal

Evitar tablas.

Mostrar información ejecutiva mediante cards.

Ejemplo:

-   Pool Bancario --- 4,521 movimientos
-   Pool ERP --- 4,487 registros
-   Pool Facturas --- 4,430 documentos
-   IA --- 96.8% conciliado automáticamente
-   Pendientes --- 48 casos
-   Conciliaciones hoy --- 3,241
-   Tiempo promedio --- 2.3 segundos

------------------------------------------------------------------------

# Gráficos

-   Líneas suaves
-   Áreas con degradados ligeros
-   Sin gráficos 3D
-   Sin colores saturados

------------------------------------------------------------------------

# Pools

Cada origen de información posee su propio pool.

Ejemplo:

## Pool Bancario

-   Registros
-   Última sincronización
-   Estado
-   Botón "Entrar"

## Pool ERP

Misma estructura.

## Pool Facturas

Misma estructura.

------------------------------------------------------------------------

# Pantalla de Conciliación

Debe sentirse como una IA trabajando.

    Movimiento Bancario
            │
            ▼
         IA Analizando
     Confianza: 98%
            │
            ▼
     Registro ERP
            │
            ▼
     Factura PDF
            │
            ▼
      Conciliado

El usuario solo interviene cuando sea necesario.

------------------------------------------------------------------------

# Panel de IA

Siempre visible.

Mostrar:

-   Conciliaciones en proceso
-   Última decisión
-   Nivel de confianza
-   Reglas utilizadas
-   Aprendizajes recientes

------------------------------------------------------------------------

# Estados

-   🟢 Conciliado
-   🟡 Pendiente
-   🔴 Error
-   🔵 Procesando

------------------------------------------------------------------------

# Upload

Tres zonas independientes:

-   Estado Bancario
-   ERP
-   Facturas

Cada una con:

-   Drag & Drop
-   Barra de progreso
-   Estado del procesamiento

------------------------------------------------------------------------

# Detalle de una Conciliación

Tres columnas.

**Izquierda**

Movimiento bancario.

**Centro**

Registro ERP.

**Derecha**

Factura PDF.

Abajo:

## Explicación IA

> La IA determinó la conciliación porque:
>
> -   mismo monto
> -   diferencia de fecha de 1 día
> -   referencia parcial coincidente
> -   proveedor similar
>
> Confianza: 98.4%

Acciones:

-   Aceptar
-   Corregir

------------------------------------------------------------------------

# Animaciones

-   Hover suave
-   Fade
-   Elevación ligera de cards

Evitar animaciones llamativas.

------------------------------------------------------------------------

# Sensación General

La aplicación debe sentirse como un producto moderno de IA y no como un
sistema contable tradicional.

El usuario debe percibir que:

-   Los documentos llegan automáticamente a sus pools.
-   La IA trabaja continuamente en segundo plano.
-   Solo participa cuando existen excepciones.

Inspirarse en productos fintech modernos con grandes tarjetas, mucho
espacio en blanco y jerarquía visual clara.

## Concepto

> **Mission Control para la conciliación financiera impulsada por IA.**
