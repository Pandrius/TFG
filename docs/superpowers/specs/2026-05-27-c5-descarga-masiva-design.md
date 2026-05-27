# C.5 — Descarga masiva (ZIP)

**Sub-bloque 5 del sub-proyecto C** (rediseño + UX de documentos).
Fecha de cierre: 2026-05-27.
Estado: spec aprobada; pendiente plan de implementación.

## Resumen

Añadir selección múltiple de documentos en `/mis-documentos` con descarga en
bloque como archivo ZIP. El ZIP se genera en servidor descargando los objetos
desde Supabase Storage y empaquetándolos con `jszip`.

## Funcionalidad

### Selección múltiple en `TablaDocumentos`

**Cabecera de tabla** (columna nueva, primera):
- Checkbox "Seleccionar todo" (`<input type="checkbox">`), indeterminado si
  selección parcial.
- Al marcar: selecciona todos los IDs del filtro activo (no todos en BD).

**Por fila** (nueva columna inicial):
- Checkbox individual. Controlado por estado `seleccionados: Set<string>`.
- La columna de grid cambia de
  `grid-cols-[44px_1fr_120px_100px_120px_30px]` a
  `grid-cols-[28px_44px_1fr_120px_100px_120px_30px]` (añade 28 px al inicio).

### Barra de acciones flotante

Visible cuando `seleccionados.size >= 1`.
Posición: `fixed bottom-6 left-1/2 -translate-x-1/2 z-30`.
Estilos: `bg-card border border-rule rounded-full shadow-[var(--shadow-3)]
px-5 py-3 flex items-center gap-4`.

Contenido:
```
[N seleccionados]  [Descargar (N) ↓]  [✕ Deseleccionar todo]
```
- `N seleccionados`: `text-[13px] font-medium`.
- `Button variant="primary" size="sm"` "Descargar (N)" → dispara descarga.
- `Button variant="ghost" size="sm"` "✕" → limpia selección.

### Descarga

Al pulsar "Descargar (N)":
1. `setDescargando(true)` (deshabilita botón, muestra spinner en label).
2. `POST /api/descargar-zip` con body `{ ids: [...seleccionados] }`.
3. Recibe blob `application/zip`.
4. Crea `URL.createObjectURL(blob)` + `<a>` sintético, dispara click.
5. `setDescargando(false)`, limpia selección.
6. Si error (non-200): toast err con el mensaje del servidor.

## Endpoint `POST /api/descargar-zip`

**Archivo:** `web/src/app/api/descargar-zip/route.ts`

### Request

```
POST /api/descargar-zip
Content-Type: application/json
{ "ids": ["uuid1", "uuid2", ...] }
```

### Validaciones

- Auth obligatoria (Supabase server client).
- `ids` debe ser array de strings no vacío.
- Máximo **20 IDs** por petición → 400 `"Máximo 20 documentos por descarga."`.
- Para cada ID: el documento debe existir y ser accesible por el usuario
  (propietario, o `confidencialidad = 0`).

### Proceso

```ts
// pseudocódigo
const admin = crearClienteAdmin();
const { data: docs } = await admin
  .from("Documentos")
  .select("id, nombre, url, user_id, confidencialidad")
  .in("id", ids);

// Filtrar acceso: propietario || público
const docsAccesibles = docs.filter(d =>
  d.user_id === user.id || d.confidencialidad === 0
);

const zip = new JSZip();

for (const doc of docsAccesibles) {
  const { data: urlData } = await admin.storage
    .from("almacen_documentos")
    .createSignedUrl(doc.url, 60);  // 60 s suficiente para descarga server-side
  const res = await fetch(urlData.signedUrl);
  const buffer = await res.arrayBuffer();
  zip.file(doc.nombre, buffer);
}

const contenido = await zip.generateAsync({ type: "nodebuffer" });

return new Response(contenido, {
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="documentos.zip"',
  },
});
```

### Errores

| Caso | Status | Mensaje |
|---|---|---|
| Sin auth | 401 | `"No autenticado"` |
| ids inválido o vacío | 400 | `"Lista de documentos no válida."` |
| Más de 20 | 400 | `"Máximo 20 documentos por descarga."` |
| Ningún doc accesible | 404 | `"No tienes acceso a ninguno de los documentos seleccionados."` |
| Error en zip | 500 | `"Error al generar el archivo ZIP."` |

## Dependencia nueva

```bash
npm install jszip
npm install --save-dev @types/jszip
```

`jszip` es puro JavaScript, sin dependencias nativas. Funciona en Node.js
(App Router route handlers) sin configuración adicional.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `(app)/mis-documentos/TablaDocumentos.tsx` | +checkboxes, +barra flotante, +lógica descarga |
| `web/src/app/api/descargar-zip/route.ts` | **Nuevo** — endpoint ZIP |
| `package.json` / `package-lock.json` | +jszip |

## Lo que NO va en C.5

- Descarga masiva desde `/explorar` (docs de otros usuarios) — fuera de scope.
- Progreso real de la descarga en cliente (el blob se recibe en un solo chunk).
- ZIP con carpetas/subcarpetas (todos los ficheros van al raíz del ZIP).

## A revisar (humano)

- **Tamaño máximo**: sin límite de tamaño total en esta spec (solo 20 docs).
  Si los 20 documentos pesan 200 MB en total, el servidor tendrá que descargar y
  mantener en memoria. Aceptable para TFG; en producción habría que usar streaming.
- **Nombre duplicado en ZIP**: si dos documentos tienen el mismo nombre, JSZip
  sobreescribe el segundo. Implementar sufijo ` (2)` si hay colisión o simplemente
  documentar la limitación.
- **Selección entre páginas**: la tabla muestra los 100 más recientes. Si el usuario
  filtra y selecciona, la selección se pierde al cambiar filtro. Acepatable para TFG.
