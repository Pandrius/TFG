# C.3 — Carpetas, compartidos y organizaciones

**Sub-bloque 3 del sub-proyecto C** (rediseño + UX de documentos).
Fecha de cierre: 2026-05-27.
Estado: spec aprobada; pendiente plan de implementación.

## Resumen

Rediseño de cinco pantallas al sistema Esmeralda Biblioteca + añadido de
"Mover a carpeta" desde `/mis-documentos`. Toda la funcionalidad existe en BD
y en server actions; C.3 es principalmente un esfuerzo de UI.

| Pantalla | Trabajo |
|---|---|
| `/carpetas` | Rediseño + rename inline |
| `/carpetas/[id]` | Rediseño + unlink documento |
| `/compartidos` | Rediseño (sin cambios funcionales) |
| `/organizaciones` | Rediseño |
| `/organizaciones/[id]` | Rediseño |
| `/mis-documentos` (TablaDocumentos) | +Mover a carpeta en menú ⋯ |

## Sin cambios en base de datos

Todas las tablas (`carpetas`, `Permisos`, `organizaciones`, `miembros`,
`favoritos`, `bloqueos`) ya existen con las columnas necesarias.

## Pantalla `/carpetas`

Ancho `max-w-4xl mx-auto`, layout vertical:

**Cabecera:**
- Eyebrow: `— organización`
- H1: `Mis *carpetas*`
- Subtítulo: `N carpetas`
- Botón `+ Nueva carpeta` (primary) a la derecha → abre formulario inline debajo
  del header (no modal).

**Formulario inline "Nueva carpeta"** (visible solo al pulsar el botón):
- `Input` con placeholder `Nombre de la carpeta…` + `Button primary` "Crear" +
  `Button ghost` "Cancelar".
- Al crear: POST con server action `crearCarpeta` → revalidate + cierra formulario.

**Lista de carpetas** (grid `rounded-[14px] border border-rule bg-paper overflow-hidden`):
- Cabecera: `Carpeta | Documentos | (acciones)` (itálica muted display).
- Por fila (`border-b border-rule last:border-b-0`):
  - Icono carpeta (SVG o emoji `📁` en `font-mono text-accent`).
  - `RenombrarInlineCarpeta` — igual que `RenombrarInline` de documentos pero
    llama a `renombrarCarpeta` server action (nueva).
  - Conteo de documentos (mono muted).
  - Botón `Ver` → `Link href="/carpetas/[id]"` (ghost size sm).
  - Botón `Eliminar` (danger ghost size sm) → confirm con `window.confirm` simple
    (no modal — acción rápida, una carpeta vacía no es destructiva; si tiene docs,
    los deja sin carpeta asignada).
- Estado vacío: empty state del sistema.

**Server actions nuevas/modificadas en `carpetas/acciones.ts`:**
```ts
renombrarCarpeta(_previo, datos: FormData): Promise<Resultado>
// datos: carpeta_id, nombre (≤100 chars, no vacío)
// Solo el propietario.
```

## Pantalla `/carpetas/[id]`

Cabecera con nombre de carpeta + breadcrumb `← Carpetas`.

**Lista de documentos en la carpeta:**
- Similar a `TablaDocumentos` de mis-documentos pero simplificada:
  `Documento | Tipo | Tamaño | Fecha | (acción)`
- Por fila: icono tipo + nombre (link a `/documentos/[id]`) + chip confidencialidad
  (Tag pub/priv read-only) + tamaño + fecha.
- Botón `Quitar de carpeta` (ghost sm) → server action `quitarDocumentoDeCarpeta`:
  `UPDATE Documentos SET carpeta_id = null WHERE id = ? AND user_id = ?`.
- Estado vacío: `Esta carpeta está vacía. Mueve documentos desde /mis-documentos`.

**Server actions nuevas en `carpetas/acciones.ts`:**
```ts
quitarDocumentoDeCarpeta(_previo, datos: FormData): Promise<Resultado>
// datos: doc_id
// UPDATE Documentos SET carpeta_id = null
```

## Pantalla `/compartidos`

Rediseño sin cambios funcionales.

**Cabecera:**
- Eyebrow: `— acceso compartido`
- H1: `Compartidos *conmigo*`
- Subtítulo: `N documentos`

**Lista** (misma estructura visual que Explorar):
- Por fila: tipo chip + nombre (link `/documentos/[id]`) + autor + fecha + KB +
  Tag pub/priv + `Button ghost sm` "Descargar" → `/api/documentos/[id]/url`.
- Estado vacío: "Nadie ha compartido documentos contigo todavía."

## Pantalla `/organizaciones`

**Cabecera:**
- Eyebrow: `— equipos`
- H1: `*Organizaciones*`
- Botón `+ Nueva organización` (primary) → formulario inline.

**Formulario inline:**
- `Input` nombre (`≤100 chars`) + `Button primary` "Crear" + `Button ghost` "Cancelar".
- Server action `crearOrganizacion` (ya existe).

**Lista de organizaciones:**
- Por fila: nombre (link `/organizaciones/[id]`) + conteo miembros + botón "Eliminar"
  (danger ghost, solo si no hay miembros o el propietario decide).
- Estado vacío.

## Pantalla `/organizaciones/[id]`

**Cabecera:**
- Breadcrumb `← Organizaciones`.
- H1: nombre de la organización.
- Subtítulo: `N miembros`.

**Lista de miembros:**
- Por fila: Avatar sm + nombre + @username + rol (badge Tag) + botón "Revocar"
  (ghost sm) → server action `quitarMiembro` (ya existe).

**Invitar miembro:**
- `Input` buscar @usuario + `Button primary` "Invitar".
- Server action `invitarMiembro` (ya existe en `organizaciones/[id]/FormularioMiembro.tsx`).
- Rediseño del FormularioMiembro con componentes del sistema.

## Mover a carpeta desde `/mis-documentos`

En `TablaDocumentos.tsx`, el menú ⋯ por fila añade una nueva opción:
`Mover a carpeta`. Al pulsar, abre `ModalMoverACarpeta`.

**`ModalMoverACarpeta`** (cliente, nuevo fichero):
- Usa `Modal` del sistema, `titulo="Mover a carpeta"`, `tono="info"` (o default).
- Carga la lista de carpetas del usuario (se recibe como prop desde `TablaDocumentos`,
  que a su vez la recibe desde la página server — evitamos fetch adicional desde cliente).
- Select desplegable nativo `<select>` estilizado (borde `border-rule`, fondo `card`,
  radio 8 px) con todas las carpetas + opción "Sin carpeta".
- Botón `primary` "Mover" + `ghost` "Cancelar".
- Server action `moverDocumentoACarpeta`:

```ts
moverDocumentoACarpeta(_previo, datos: FormData): Promise<Resultado>
// datos: doc_id, carpeta_id (string | "")
// carpeta_id vacío → SET carpeta_id = null
// UPDATE Documentos SET carpeta_id = ? WHERE id = ? AND user_id = ?
```

**Cambio en `mis-documentos/page.tsx`:**
- Añadir query de carpetas del usuario y pasar como prop a `TablaDocumentos`.

**Cambio en `TablaDocumentos`:**
- Nueva prop `carpetas: { id: string; nombre: string }[]`.
- Nueva opción en menú ⋯: `Mover a carpeta`.
- Estado `modalMover: DocumentoFila | null`.
- Render de `ModalMoverACarpeta` al final (junto a los otros modales).

## Server actions nuevas

En `web/src/app/(app)/carpetas/acciones.ts`:
```ts
renombrarCarpeta(_previo, datos: FormData): Promise<Resultado>
quitarDocumentoDeCarpeta(_previo, datos: FormData): Promise<Resultado>
```

En `web/src/app/(app)/mis-documentos/acciones.ts`:
```ts
moverDocumentoACarpeta(_previo, datos: FormData): Promise<Resultado>
```

Importar `Resultado` de `../../mis-documentos/acciones` o extraerlo si ya hay
duplicación (en C.2 ya se evaluó; si hay 3+ usos, extraer a
`web/src/lib/tipos/resultado.ts`).

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `(app)/carpetas/page.tsx` | Rediseño completo + formulario inline + rename inline |
| `(app)/carpetas/[id]/page.tsx` | Rediseño + acción quitar |
| `(app)/carpetas/FormularioCarpeta.tsx` | Eliminar (reemplazado por inline en page) |
| `(app)/carpetas/acciones.ts` | +`renombrarCarpeta`, +`quitarDocumentoDeCarpeta` |
| `(app)/compartidos/page.tsx` | Rediseño completo |
| `(app)/organizaciones/page.tsx` | Rediseño + formulario inline |
| `(app)/organizaciones/[id]/page.tsx` | Rediseño |
| `(app)/organizaciones/[id]/FormularioMiembro.tsx` | Rediseño con componentes del sistema |
| `(app)/mis-documentos/TablaDocumentos.tsx` | +opción mover, +prop carpetas, +ModalMoverACarpeta |
| `(app)/mis-documentos/page.tsx` | +query carpetas del usuario |
| `(app)/mis-documentos/acciones.ts` | +`moverDocumentoACarpeta` |
| `components/ui/` (nuevo) `ModalMoverACarpeta.tsx` | Modal de selección de carpeta |

> Nota: `ModalMoverACarpeta` vive en `mis-documentos/` (no en `components/ui/`)
> porque es específico de esa pantalla y necesita las mismas props del contexto.

## A revisar (humano)

- **Eliminar carpeta con documentos**: los documentos quedan con `carpeta_id = null`.
  Confirmar si es aceptable o si hay que moverlos primero.
- **Organizaciones — rol**: el modelo de datos tiene un campo `rol` en la tabla
  `miembros`. Confirmar si mostrar "admin" / "miembro" en la UI o simplificarlo.
- **`Resultado` compartido**: si hay colisión entre módulos, extraer a
  `web/src/lib/tipos/resultado.ts`.
