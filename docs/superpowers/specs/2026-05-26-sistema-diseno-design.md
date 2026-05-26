# Sistema de diseño — DRES

**Sub-proyecto A** de la mejora UI/UX integral.
Fecha de cierre: 2026-05-26.
Estado: spec validada visualmente con bocetos HTML. Pendiente implementación.

## Resumen

Sistema de diseño completo para la plataforma DRES (clasificación
documental). Dirección elegida: **document-first / cálido / biblioteca**,
con paleta **Esmeralda biblioteca** (verde joya + oro + papel marfil),
tipografía Fraunces (serif italic editorial) + Inter (cuerpo) + JetBrains
Mono (datos técnicos), y un componente base coherente con la estética.

El sistema cubre tokens (claro y oscuro), escala tipográfica, componentes
(botones, inputs, tags, avatares, toasts, modal, pipeline, navegación,
estados vacíos y de carga) y patrones de pantalla.

## Contexto y motivación

La UI actual usa Tailwind v4 con paleta por defecto (azul, fuente Geist,
grises). Es funcional pero indistinguible de cualquier SaaS. El TFG
necesita una UI con personalidad propia, defendible frente a tribunal y
que comunique seriedad editorial sin caer en el genérico.

## Decisiones tomadas (iteraciones)

Las iteraciones se hicieron como ficheros HTML standalone en `design/`,
abriendo cada uno en navegador y comparando direcciones aplicadas (no
descritas). Cada decisión cierra una y abre la siguiente:

| Iter | Fichero | Decisión |
|---|---|---|
| 00 | `design/00-personalidad.html` | **Dirección D** (document-first / cálido) sobre 4 opciones: editorial suizo, brutalista, tech oscuro, document-first. |
| 01 | `design/01-direccion-elegida.html` | **Mezclar D + estructura de C** (KPIs, pipeline en vivo, actividad reciente). Modo oscuro = "tinta sobre papel oscuro" (marrón cargado, no negro técnico). |
| 02 | `design/02-paletas.html` | **Descartar paleta inicial (terracota+crema+serif italic)** por colisión visual con la marca Anthropic. Comparadas 5 alternativas. |
| 03 | `design/03-paletas-verdes.html` | **Esmeralda biblioteca** elegida entre 5 verdes (bosque, pino, salvia, olivo, esmeralda). Verde joya saturado + oro saturado + papel marfil dorado. |
| 04 | `design/04-sistema.html` | Sistema completo: 9 bloques (tokens, tipo, botones, inputs, feedback, modal, pipeline, navegación, vacíos/carga). |
| 05 | `design/05-botones.html` | **Botón primary "soft tinted"** (fondo accent-soft + texto accent) entre 6 alternativas al negro relleno inicial. |
| 04 (revisión) | `design/04-sistema.html` | Aplicado el primary soft tinted. **Tags pasan a estilo outline** (borde fino + sin fondo) para no chocar con el nuevo botón. |

## Tokens

### Paleta — modo claro

| Rol | Hex | Uso |
|---|---|---|
| `paper` | `#ECEAD8` | Fondo de página, sidebar |
| `card` | `#F8F6E4` | Tarjetas, contenido principal |
| `soft` | `#E2DEC5` | Bandas internas, separadores suaves |
| `rule` | `#CCC8AB` | Bordes de tarjetas e inputs |
| `ink` | `#0F1C18` | Texto principal |
| `ink-soft` | `#1D2E27` | Texto secundario fuerte |
| `mute` | `#6A7268` | Texto desactivado, metadatos |
| `accent` | `#0F5A45` | Verde esmeralda (primary, links, "público") |
| `accent-hover` | `#0C4836` | Hover del accent |
| `accent-soft` | `#C9DDD2` | Fondos tinted, bordes de tag "público" |
| `accent-tint` | `#E6EFE9` | Halo de focus |
| `oro` | `#A5701E` | "Privado", soporte editorial |
| `oro-soft` | `#F1DEB0` | Bordes y fondos suaves del oro |
| `danger` | `#8C2A20` | Errores, destructivos |
| `danger-soft` | `#EFD2CD` | Fondos suaves de error |

### Paleta — modo oscuro

Verde muy oscuro como base, tinta crema cálida. El accent sube saturación
para mantener contraste; el oro también se aclara.

| Rol | Hex |
|---|---|
| `paper` | `#0E1816` |
| `card` | `#141F1B` |
| `soft` | `#1B2823` |
| `rule` | `#283831` |
| `ink` | `#EBE3CA` |
| `ink-soft` | `#D2C8AB` |
| `mute` | `#8A9388` |
| `accent` | `#46B891` |
| `accent-soft` | `#1E3A30` |
| `oro` | `#E0A65A` |
| `oro-soft` | `#3A2D14` |
| `danger` | `#E08070` |
| `danger-soft` | `#3F1E17` |

### Espaciado (escala de 4)

`sp-1 4` · `sp-2 8` · `sp-3 12` · `sp-4 16` · `sp-5 20` · `sp-6 24` ·
`sp-8 32` · `sp-10 40` · `sp-12 48`.

### Radios

`r-sm 6` (inputs pequeños, chips de stage) · `r-md 10` (inputs, botones
no-pill) · `r-lg 14` (tarjetas) · `r-xl 18` (paneles principales,
modales) · `pill 999` (botones, tags, avatares).

### Sombras

- `shadow-1` — hairline, solo borde inferior (cards en reposo).
- `shadow-2` — cards elevadas, toasts.
- `shadow-3` — modales, popovers grandes.

## Tipografía

| Token | Familia | Tamaño / tracking / line-height |
|---|---|---|
| `display` | Fraunces 500 | 56 / -0.025em / 1 |
| `h1` | Fraunces 500 | 36 / -0.02em / 1.1 |
| `h2` | Fraunces 500 | 24 / -0.015em / 1.15 |
| `h3` | Fraunces 500 | 18 / -0.01em / 1.2 |
| `eyebrow` | Fraunces 400 italic | 14 / color: accent |
| `body-lg` | Inter 400 | 17 / 1.6 |
| `body` | Inter 400 | 15 / 1.6 |
| `body-sm` | Inter 400 | 13 / 1.55 |
| `caption` | Inter 400 | 12 / color: mute |
| `overline` | JetBrains Mono 400 | 11 / uppercase / 0.08em |
| `mono` | JetBrains Mono 400 | 13 |

**Convención de uso:** Fraunces aparece en títulos y "acentos italianos"
(eyebrow, labels de formulario, nombres propios en oraciones —
`"Hola, *Andrés*"`). Inter para texto corrido. JetBrains Mono para datos
técnicos (tamaños de archivo, fechas relativas en monoespaciado, códigos
HTTP, paths).

## Componentes

Todos los componentes están renderizados en `design/04-sistema.html` con
estados reales (hover, focus, disabled, loading, error, vacío). Esta
sección documenta el contrato, no la pinta.

### Botones

| Variante | Uso | Estilo |
|---|---|---|
| `primary` | Acción dominante neutra ("+ Subir archivo") | **Soft tinted**: fondo `accent-soft`, texto `accent`. Hover: fondo `#B8CFC2`, texto `accent-hover`. |
| `accent` | Confirmar acción positiva ("Confirmar y publicar") | Relleno `accent`, texto blanco. Hover: `accent-hover`. |
| `ghost` | Secundario / cancelar | Transparente, borde `rule`, texto `ink`. Hover: fondo `soft`. |
| `danger` | Destructivo ("Eliminar documento") | Relleno `danger`, texto blanco. |
| `link` | Inline ("Ver detalles →") | Transparente, texto `accent`, subrayado fino con `accent-soft`. |

Tamaños: `sm` (6/12, 12px), `md` (10/18, 13px), `lg` (13/22, 14px).
Estados: normal, hover, focus (halo 3px `accent-tint`), disabled (45 %
opacidad), loading (spinner interno).

### Inputs

Todos comparten: borde `rule`, radio `r-md`, padding 10/14, focus con
borde `accent` + halo `accent-tint`, error con borde `danger` + halo
`danger-tint`.

Variantes incluidas: `input` text, password, email, search con icono y
atajo `⌘K`, `select` (sin chevron nativo), `textarea` con resize, `checkbox`
(con marca ✓ al activar), `radio` (con relleno circular interno),
`toggle` (switch 38×22), `dropzone` (área dashed con icono, título y
ayuda de formatos).

**Labels en Fraunces 400 italic** — micro-detalle editorial sin
sacrificar lectura.

### Tags / badges

Estilo **outline** (transparente + borde + texto en color). Variantes
semánticas:

| Tag | Borde | Texto |
|---|---|---|
| `pub` | `accent-soft` | `accent` |
| `priv` | `oro-soft` | `oro` |
| `proc` | `rule` | `ink-soft` |
| `err` | `danger-soft` | `danger` |
| `neutral` | `rule` | `mute` |

Cada tag lleva un `dot` (punto de 6px) del mismo color a la izquierda.

### Avatares

3 tamaños (sm 24, md 32, lg 44), redondos, iniciales en Fraunces italic
500. 3 esquemas de color: `acc`, `oro`, `neutral`. Soporta stack (varios
solapados con borde card) con contador `+N` al final.

### Toasts (notificaciones)

3 variantes: `ok` (verde), `warn` (oro), `err` (granate). Estructura: ic
+ título + sub + botón de cerrar. Aparecen en esquina, no bloquean.

### Modal de confirmación crítica

Estructura: icono (oro para advertencias), título Fraunces 500 con
acento italianizado, descripción, "pill" del recurso afectado, checkbox
de confirmación obligatorio, acciones a la derecha.

**Patrón clave para esta plataforma:** al hacer un documento público,
el botón "Sí, hacerlo público" empieza **disabled** y solo se habilita
al marcar el checkbox "He revisado el documento y confirmo que no
contiene datos personales ni información confidencial". Este patrón se
usa para toda acción cuyo blast-radius sea irreversible o exponga datos.

### Pipeline de subida

Cada archivo es una fila con icono + nombre + 4 stages
(`subido → texto → analizando → guardado`) + barra de progreso + %.
Stages tienen 4 estados visuales: pending (gris), done (accent-soft),
now (tinta sólida, con dot pulsando), err (danger-soft). Soporta varias
filas en paralelo (un archivo por fila, todos avanzan a la vez).

### Navegación

- **Tabs subrayados** (Fraunces italic 14) para secciones principales de
  página. Underline `accent` 2px en activo.
- **Pills** (Inter 12, fondo `soft`) para filtros rápidos. Activo:
  fondo `card`, texto `ink`.
- **Breadcrumbs** (Inter 13). Separador `/` en `rule`. Última miga en
  `ink`.

### Estados vacíos y de carga

- **Empty state**: icono 56×56 en `accent-tint`, título Fraunces, copy
  descriptivo, CTA accent.
- **Skeleton**: barras shimmer (gradient soft → rule-soft → soft, 1.5 s).
- **Spinner**: 22×22, borde `accent-soft` con top `accent`.

## Pantallas de referencia

Maquetadas en `design/01-direccion-elegida.html` con la mezcla validada
(D + KPIs de C):

- **"Mis documentos"** completa, con header personalizado ("Hola,
  *Andrés*"), 4 KPIs (Documentos / Privados / Públicos / Espacio),
  panel "Subidas en curso" + panel "Actividad reciente", tabla
  filtrable con pills.
- Modo claro y modo oscuro de la misma vista.

## Implementación (pendiente)

Esta spec NO incluye la implementación. Lo que toca después:

1. **Configurar fuentes** en `web/src/app/layout.tsx` vía
   `next/font/google` (Fraunces, Inter, JetBrains Mono) con variables
   `--font-display`, `--font-sans`, `--font-mono`.
2. **Reescribir `web/src/app/globals.css`** con las CSS custom
   properties documentadas arriba, incluyendo `@media (prefers-color-scheme: dark)`
   con la paleta oscura. Reemplazar el `@theme inline` de Tailwind v4
   con los nuevos tokens.
3. **Crear `web/src/components/ui/`** con los componentes base:
   `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`,
   `Toggle`, `Dropzone`, `Tag`, `Avatar`, `Toast`, `Modal`,
   `PipelineRow`, `EmptyState`, `Skeleton`, `Spinner`, `Tabs`,
   `Breadcrumb`.
4. **Decidir cuándo aplicar** — opciones:
   a) PR único "design system v1" que cambia globals + crea componentes
      y migra todas las pantallas existentes de golpe.
   b) Aplicar incrementalmente como parte del sub-proyecto B
      (auth + perfil): el primer commit configura los tokens y crea los
      componentes que usa la auth; los demás se crean conforme se
      necesitan en C.
   Recomendación: **(b)**, porque (a) acumula cambios de UI no
   justificados por feature y ralentiza la revisión.

## A revisar (humano)

- **Carga de fuentes**: Fraunces tiene 9pt opsz axis; verificar que se
  cargue solo el peso 500 y el italic 400 (no toda la familia, que pesa
  mucho).
- **Modo oscuro**: validado en bocetos HTML, no aplicado todavía a Next.
  Al implementar, comprobar contraste real en pantallas con datos
  (especialmente los tags outline en modo oscuro y la barra de
  progreso).
- **Accesibilidad de tags outline**: el contraste texto-fondo es alto
  porque el fondo es siempre `card`/`paper`, pero el contraste
  texto-borde es bajo. Aceptable porque el texto no depende del borde
  para legibilidad, pero conviene verificar con un test WCAG real.
- **Personalidad vs sobriedad**: la combinación verde+oro+serif italic
  puede leerse como "demasiado decorativa" para algún tribunal.
  Mantenemos por ahora; revisar después de aplicar a 2-3 pantallas
  reales.
- **Sub-proyecto siguiente (B)**: auth + perfil. Requiere otro
  brainstorm específico (qué campos, qué flujos, qué medidas de
  recuperación de contraseña sin confirmación de email obligatoria).

## Fuente de verdad visual

| Fichero | Qué muestra |
|---|---|
| `design/00-personalidad.html` | Comparativa inicial de 4 personalidades |
| `design/01-direccion-elegida.html` | D extendida con KPIs/pipeline, claro y oscuro |
| `design/02-paletas.html` | 5 paletas (la primera descartada) |
| `design/03-paletas-verdes.html` | 5 verdes en la misma familia |
| `design/04-sistema.html` | **Sistema completo** (tokens, tipo, componentes) |
| `design/05-botones.html` | 6 alternativas al primary |
