# C.2 — Detalle de documento (`/documentos/[id]`)

**Sub-bloque 2 del sub-proyecto C** (rediseño + UX de documentos).
Fecha de cierre: 2026-05-27.
Estado: spec aprobada; pendiente plan de implementación.

## Resumen

Rediseño de la página de detalle de documento (`/documentos/[id]`) al sistema
de diseño Esmeralda Biblioteca. La funcionalidad ya existe y funciona (descarga,
permisos, metadatos, score de confianza del modelo). C.2 aporta:

- Aplicar tokens y componentes del sistema de diseño.
- Añadir reclasificación manual desde esta página (reusa la server action de C.1).
- Breadcrumb de vuelta a `/mis-documentos`.
- Sección de permisos mejorada visualmente (sólo propietario).
- Estado de carga/vacío con componentes del sistema.

## Funcionalidad existente a preservar

| Qué | Dónde |
|---|---|
| Auth + redirect si sin acceso | `page.tsx` línea 28 |
| Descarga → `/api/documentos/[id]/url` | `page.tsx` línea 88 |
| Panel permisos (propietario): lista + revocar | `page.tsx` líneas 95–129 |
| Invitar usuario por username | `FormularioInvitacion.tsx` |
| Score de confianza del modelo | `page.tsx` línea 79 |

## Pantalla `/documentos/[id]`

Ancho `max-w-3xl mx-auto`, layout vertical:

### 1. Breadcrumb

```
← Mis documentos
```

Un `<Link href="/mis-documentos">` con estilo `text-mute text-sm hover:text-ink
transition-colors` y chevron `‹`. Encima del H1.

### 2. Cabecera del documento

- **Eyebrow** (Fraunces italic accent pequeño): `— tu archivo personal`
- **H1** (Fraunces 500 24 px): nombre del documento (`break-words`)
- **Línea de metadatos** (caption mono muted): `PDF · 12 de mayo de 2026 · 234 KB`

### 3. Bloque de clasificación + acciones

Panel `border border-rule rounded-[14px] bg-paper p-5`, layout de dos columnas:

**Columna izquierda:**
- `Tag variant="pub"` o `variant="priv"` para el estado.
- Si hay `probabilidad`: barra de confianza.
  - Texto: `Confianza del modelo: 87 %`
  - Barra fina (4 px alto, `bg-rule` de fondo, fill `bg-accent` al porcentaje).

**Columna derecha (acciones):**
- `Button variant="primary" size="md"` → `href="/api/documentos/[id]/url"` (descarga directa).
  Texto: `Descargar`.
- Si propietario + privado: `Button variant="ghost" size="md"` → abre ModalHacerPublico.
  Texto: `Hacer público`.
- Si propietario + público: `Button variant="ghost" size="md"` → llama `actualizarConfidencialidad`
  con `nueva=1` sin modal (acción directa + toast ok).
  Texto: `Marcar como privado`.

### 4. Permisos de acceso (sólo propietario)

Sección con `<h2>` Fraunces italic accent pequeño: `Permisos de *acceso*`.

**Lista de usuarios con permiso:**
- Si no hay: texto muted "Nadie tiene acceso explícito todavía."
- Por cada permiso: fila `grid grid-cols-[32px_1fr_auto]` con Avatar pequeño (32 px,
  fallback inicial), nombre/username, botón `Button variant="ghost" size="sm"` "Revocar".
  El botón llama `quitarPermiso` (server action existente).

**Invitar usuario:**
- `FormularioInvitacion` existente, rediseñado con `Input` + `Button` del sistema.
- Input placeholder: `Buscar por @usuario…`.
- Botón primario: `Invitar`.

### 5. Modal reclasificación

Reutilizar `ModalHacerPublico` importado de `../../mis-documentos/ModalHacerPublico`.
No duplicar.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `web/src/app/(app)/documentos/[id]/page.tsx` | Reescritura completa al sistema |
| `web/src/app/(app)/documentos/[id]/FormularioInvitacion.tsx` | Rediseño con componentes del sistema |
| `web/src/app/(app)/documentos/[id]/acciones.ts` | Sin cambios funcionales |

## Server actions

- `actualizarConfidencialidad` — importada desde `../../mis-documentos/acciones` (no copiar).
- `quitarPermiso` — existente en `./acciones.ts`.
- `invitarUsuario` (dentro de `FormularioInvitacion.tsx`) — existente en `./acciones.ts`.

## Sin cambios en base de datos

No se añaden tablas ni columnas. Todo lo necesario ya existe.

## A revisar (humano)

- **Reclasificar a privado sin modal**: es acción directa (público → privado).
  Confirmar que esto es aceptable o si también quiere modal.
- **Descarga como link directo** (`<a href="...">` en lugar de `<button>`):
  el redirect del endpoint ya funciona. Puede mostrarse como descarga del navegador.
- **Invitar por username**: la búsqueda actual en `FormularioInvitacion` es exacta
  (busca `nombre_usuario = valor`). Confirmar si se desea búsqueda parcial.
