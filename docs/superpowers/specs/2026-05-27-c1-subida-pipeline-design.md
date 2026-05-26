# C.1 — Subida + pipeline + reclasificar + /mis-documentos

**Sub-bloque 1 del sub-proyecto C** (rediseño + UX de documentos).
Fecha de cierre: 2026-05-27.
Estado: spec aprobada; pendiente plan de implementación.

## Resumen

Reescritura del componente de subida para soportar **multi-upload paralelo
con pipeline visible por archivo**, añadido del flujo de **reclasificación
manual** con modal de aviso al hacer público, **CRUD básico de documentos**
(renombrar inline + eliminar con confirmación), y **migración de
`/mis-documentos` e `/inicio`** al sistema de diseño Esmeralda biblioteca.

C.1 es el corazón funcional del producto: es la pantalla que el usuario ve
al iniciar sesión y donde realiza el 90% de las acciones cotidianas. Las
demás pantallas (carpetas, organizaciones, explorar, detalle, descarga
masiva) se cubren en C.2–C.5.

## Decisiones tomadas

| Pregunta | Decisión |
|---|---|
| Paralelismo de multi-upload | **Cola en cliente con concurrencia 3**, límite 10 archivos por tanda. `/api/subir` se queda intacto (una conexión SSE por archivo). |
| Alcance de "reclasificar" | **Override manual** (UPDATE en BD, sin re-llamar al modelo). Si pasa de Privado→Público, modal con checkbox obligatorio. Público→Privado es directo. |
| Stages del pipeline | **4 fases** alineadas con el sistema (`subido → texto → analizando → guardado`). `subido` es local; las otras 3 mapean los eventos SSE del server (`extrayendo→texto`, `clasificando→analizando`, `guardando→guardado`). |
| Comportamiento tras completar | Fila se marca con ✓, queda visible 5 s, luego fade-out. `router.refresh()` para que el documento aparezca en la lista. |
| Comportamiento ante error | Fila roja con mensaje, botones "Reintentar" y "Quitar". |
| Cancelar pendiente | Si el archivo está en cola (no procesando), botón ✕ lo descarta antes de que se ejecute. |
| Scope de `/mis-documentos` | Pasa entera al sistema: KPIs + panel "Subidas en curso" + tabla filtrable con tags outline + acciones por fila. |
| Scope adicional | También `/inicio` migrada al sistema (dashboard de bienvenida). |

## Pantallas

### `/mis-documentos` (rediseñada)

Estructura vertical, ancho `max-w-6xl mx-auto`:

**1. Header**
- Eyebrow: `— tu archivo personal` (Fraunces italic accent).
- H1: `Mis *documentos*` (Fraunces 500, "documentos" italic accent).
- Subtítulo: `24 documentos · 18,4 MB · última subida hace 2 h` (caption).
- Botón "+ Subir archivo" (primary) a la derecha, abre el file picker
  multi-select. Drag-drop disponible en cualquier parte del área del panel.

**2. KPIs (4 columnas)**
- `Documentos` · total · `+N hoy` (leaf si hay novedad).
- `Privados` · con anillo de progreso accent.
- `Públicos` · con anillo de progreso accent.
- `Espacio` · `X / 500 MB` · `%`.

**3. Panel "Subidas en curso"** (solo visible si hay subidas activas o
recién completadas)
- H2: `Subidas *en curso*`.
- Sub: `N archivos siendo procesados`.
- Una fila por archivo del lote actual con:
  - Icono del tipo (`PDF`/`DOC`/`XLS`/...).
  - Nombre del archivo.
  - 4 chips de stage (`subido / texto / analizando / guardado`), uno
    activo según el estado actual del archivo (chip `now` con dot que
    pulsa, `done` en accent-soft, pendiente en `soft`).
  - Barra de progreso (0/33/66/100 % según stage).
  - `%` o ✓ "listo" al final.
  - Si está pendiente en cola: botón ✕ "Cancelar".
  - Si dio error: chip `err`, mensaje en línea, botones "Reintentar"
    y "Quitar".

**4. Tabla "Todos los documentos"**
- H2 + 4 pills de filtro (`Todos / Privados / Públicos / Procesando`).
- Cabecera: `Documento | Estado | Tamaño | Modificado | (acciones)`.
- Por fila:
  - Icono del tipo + nombre (clickable → `/documentos/[id]`).
  - Nombre del documento (editable inline: click en el lápiz que aparece al
    hover → input + ✓ guardar / ✕ cancelar).
  - Pill clickable de Estado (`público` o `privado`). Click cambia el
    estado:
    - Privado → Público: abre **Modal "¿Hacer este documento público?"**
      con checkbox de confirmación obligatorio.
    - Público → Privado: cambia directo (toast ok).
  - Tamaño y fecha en mono caption.
  - Botón `⋯` (icon-only ghost) abre menú con: Ver detalle, Renombrar,
    Eliminar.
  - Eliminar abre **Modal "¿Eliminar este documento?"** con tono `danger`
    y botón rojo de confirmación.

**5. Estado vacío** (si no hay documentos y no hay subidas activas)
- Empty state del sistema: icono, "Aún no hay *documentos*", CTA
  "+ Subir mi primer documento".

### `/inicio` (rediseñada)

Pantalla de bienvenida ligera tras login:

- Header con saludo personalizado: `Hola, *Andrés*.` (nombre del perfil) +
  caption con conteo de documentos.
- 3 atajos en cards grandes:
  - **Subir documento** → `/mis-documentos#upload`.
  - **Ver mis documentos** → `/mis-documentos`.
  - **Explorar la comunidad** → `/explorar`.
- Panel inferior "Actividad reciente" (placeholder por ahora; en C.2/C.3 se
  rellena con eventos reales). En C.1 muestra "Próximamente" o se omite.

## Componentes nuevos

Bajo `web/src/components/ui/` (los del sistema A + lote nuevo):

- **`Kpi`** — tarjeta KPI con título Fraunces italic, valor Fraunces 30 px,
  delta opcional, y un slot opcional para el anillo de progreso
  (`KpiAnillo`).
- **`KpiAnillo`** — círculo SVG con porcentaje, mismo color que el accent.
- **`StageChip`** — chip de fase del pipeline. Variantes `pending`, `done`,
  `now` (con dot que pulsa), `err`. Tamaño compacto.
- **`PipelineRow`** — fila completa del pipeline: icono + nombre + stages +
  barra + acción contextual (cancelar/reintentar/quitar). Acepta props
  `archivo`, `estado`, `progresoPct`, `onCancelar`, `onReintentar`,
  `onQuitar`.
- **`DropZone`** — área draggable reutilizable. Estados `idle`, `hover`,
  `disabled`. Acepta `onArchivos(File[])` y `accept`, `multiple`,
  `disabled`.

Específicos de esta pantalla, bajo `web/src/app/(app)/mis-documentos/`:

- **`PanelSubidas`** (client) — orquesta la cola de subidas:
  estado de cada archivo, concurrencia 3, gestiona los SSE.
- **`TablaDocumentos`** (client) — render de la tabla, gestión de filtros,
  pills clickables que abren el modal de reclasificación, menú
  contextual.
- **`ModalHacerPublico`** (client) — reutiliza `Modal` del sistema con
  checkbox de confirmación obligatorio y botón accent deshabilitado hasta
  marcarlo.
- **`ModalEliminar`** (client) — `Modal` tono `danger`, mensaje "esta
  acción no se puede deshacer", botón rojo.
- **`RenombrarInline`** (client) — input que reemplaza el nombre + ✓ / ✕.

## Server actions y endpoints

### Nuevas en `web/src/app/(app)/mis-documentos/acciones.ts`

```ts
"use server";

actualizarConfidencialidad(
  _previo, datos: FormData
): Promise<Resultado>
// datos: doc_id, nueva (0 público | 1 privado)
// Solo el propietario. UPDATE Documentos SET confidencialidad = nueva.

renombrarDocumento(
  _previo, datos: FormData
): Promise<Resultado>
// datos: doc_id, nombre (≤ 200 chars, no vacío)
// Solo el propietario. UPDATE Documentos SET nombre = nombre.

eliminarDocumento(
  _previo, datos: FormData
): Promise<Resultado>
// datos: doc_id
// Solo el propietario. Borra storage object + DELETE Documentos.
```

`Resultado` reusa el tipo definido en `(app)/perfil/acciones.ts` (sub-proyecto B).
Si el patrón se repite mucho, en C.2 se extrae a un fichero compartido
`web/src/lib/server-actions/resultado.ts`.

### Endpoint existente sin cambios

- `POST /api/subir` (SSE, una request por archivo) — se mantiene. El
  cliente hace N requests en paralelo gestionadas por la cola.

### Sin cambios en base de datos

`Documentos` ya tiene los campos necesarios: `id`, `nombre`,
`confidencialidad`, `tipo_archivo`, `tamano_bytes`, `fecha`, `user_id`.
Sin migración nueva.

## Cola de subidas en cliente

Implementación dentro de `PanelSubidas` (no como hook independiente — solo
se usa aquí):

- Estado: `archivos: Map<id, { fichero: File, estado: EstadoArchivo, progreso: number, error?: string }>`.
- `EstadoArchivo`: `"en_cola" | "subido" | "texto" | "analizando" | "guardado" | "listo" | "error" | "cancelado"`.
- Al añadir N archivos: se les asigna ID único (`crypto.randomUUID()`),
  estado inicial `en_cola`, se encolan.
- Loop de despacho: mientras `activos < 3 && hayEnCola`, sacar el siguiente
  de la cola, marcar `subido`, abrir SSE con `fetch("/api/subir", ...)`.
- Por cada evento SSE:
  - `extrayendo` → `texto`, progreso 33 %.
  - `clasificando` → `analizando`, progreso 66 %.
  - `guardando` → `guardado`, progreso 99 %.
  - `completado` → `listo`, progreso 100 %, `router.refresh()`.
    Tras 5 s, eliminar la fila del Map (fade-out CSS antes del unmount).
  - `error` → `error` con el mensaje. La fila persiste hasta que el
    usuario pulse "Quitar" o "Reintentar".
- "Reintentar" reinicia el archivo a `en_cola` y resetea progreso.
- "Cancelar" (solo si está `en_cola`) marca `cancelado` y filtra.
- "Quitar" (cualquier estado distinto de `subido/texto/analizando/guardado`,
  o sea no procesando) elimina la fila.

**Validación previa al encolar** (cliente):
- Máximo 10 archivos por tanda. Si el usuario añade más, se ignoran los
  excedentes con un toast warn ("Solo los 10 primeros se procesarán").
- Tamaño máximo 10 MB por archivo (chequeo cliente para feedback rápido;
  el server también lo valida).
- Formatos permitidos: pdf, docx, txt, xlsx, csv, pptx. Si no, toast err
  ("Formato no soportado: X").

## Patrón de feedback

- **Toasts** para acciones globales (renombrar OK, eliminar OK, reclasificar OK).
- **Errores de subida**: en la propia fila del pipeline, no en toast.
- **Modales** para acciones críticas (hacer público, eliminar).
- Tabla con filtros: el filtro activo se ve con la pill `on` (fondo `card`,
  texto `ink`).

## Lo que NO va en C.1

- `/documentos/[id]` (detalle) — C.2.
- Reescribir el endpoint `/api/subir` — se queda; el cambio es solo cliente.
- Cualquier funcionalidad de reclasificación por IA (solo override manual).
- Búsqueda interna en `/mis-documentos` (paginación tampoco — si la lista
  supera 100, se muestran solo los 100 más recientes).
- Etiquetado / categorización manual — no estaba en scope.
- Compartir documento desde esta pantalla — está en `/documentos/[id]`
  (C.2).
- Migración de carpetas / organizaciones / compartidos — C.3.

## A revisar (humano)

- **Cola con concurrencia 3**: validar que el servicio IA aguanta 3
  llamadas en paralelo. Si en producción genera latencia, bajar a 2.
- **Filas completadas que desaparecen tras 5 s**: si la lista de
  subidas crece mucho, el usuario puede perder de vista lo que se
  procesó. Si pasa, añadir un selector "Mostrar últimas X completadas".
- **Renombrar inline**: si el usuario llena con espacios o caracteres
  raros, qué pasa. La validación es solo "no vacío, ≤ 200 chars". Casos
  edge (solo espacios, caracteres de control) los recortamos con `.trim()`
  en server.
- **Modal hacer público + RLS**: comprobar que la policy SELECT pública
  realmente expone el documento tras el cambio. Es UPDATE simple, debería
  funcionar; revisar al smoke test.

## Fuente de verdad visual

- Pipeline visible: bloque 07 de `design/04-sistema.html` + panel
  "Subidas en curso" de `design/01-direccion-elegida.html`.
- Modal de hacer público: bloque 06 de `design/04-sistema.html`.
- KPIs: bloque KPIs de `design/01-direccion-elegida.html` y
  `design/02-paletas.html`.
- Tabla con filtros: `design/01-direccion-elegida.html`.
- No se necesita HTML adicional — el sistema cubre todos los patrones.
