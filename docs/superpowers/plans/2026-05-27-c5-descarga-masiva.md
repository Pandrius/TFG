# C.5 — Descarga masiva (ZIP): Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir selección múltiple de documentos en `/mis-documentos` con descarga en bloque como archivo ZIP generado en servidor.

**Architecture:** `TablaDocumentos` gana estado de selección y barra flotante. Nuevo endpoint `POST /api/descargar-zip` descarga cada archivo desde Supabase Storage y los empaqueta con `jszip`.

**Tech Stack:** Next.js App Router, jszip, Supabase Storage signed URLs, Tailwind v4

---

## Context

Tabla `TablaDocumentos` en `web/src/app/(app)/mis-documentos/TablaDocumentos.tsx`.
Grid actual: `grid-cols-[44px_1fr_120px_100px_120px_30px]`.
Hay que añadir una columna de checkbox a la izquierda.

El endpoint de descarga individual: `GET /api/documentos/[id]/url` (existente, solo descarga uno).
El nuevo endpoint: `POST /api/descargar-zip` (nuevo, devuelve blob ZIP).

Límite: 20 documentos por petición.

---

### Tarea 1: Instalar jszip y crear el endpoint ZIP

**Files:**
- Modify: `web/package.json` (vía npm install)
- Create: `web/src/app/api/descargar-zip/route.ts`

- [ ] **Paso 1: Instalar jszip**

Desde `web/`:
```bash
cd web
npm install jszip
```

Verificar que aparece en `package.json` en `dependencies`.

- [ ] **Paso 2: Crear el directorio del endpoint**

El archivo nuevo va en:
`web/src/app/api/descargar-zip/route.ts`

- [ ] **Paso 3: Escribir el endpoint**

```ts
import type { NextRequest } from "next/server";
import JSZip from "jszip";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const MAX_IDS = 20;

export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Lista de documentos no válida." }, { status: 400 });
  }

  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return Response.json({ error: "Lista de documentos no válida." }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return Response.json(
      { error: `Máximo ${MAX_IDS} documentos por descarga.` },
      { status: 400 },
    );
  }

  const admin = crearClienteAdmin();
  const { data: docs } = await admin
    .from("Documentos")
    .select("id, nombre, url, user_id, confidencialidad")
    .in("id", ids as string[]);

  const docsAccesibles = (docs ?? []).filter(
    (d) => d.user_id === user.id || d.confidencialidad === 0,
  );

  if (docsAccesibles.length === 0) {
    return Response.json(
      { error: "No tienes acceso a ninguno de los documentos seleccionados." },
      { status: 404 },
    );
  }

  const zip = new JSZip();

  // Descargar cada archivo y añadirlo al ZIP
  const nombresUsados = new Set<string>();
  for (const doc of docsAccesibles) {
    const { data: urlData, error: urlError } = await admin.storage
      .from("almacen_documentos")
      .createSignedUrl(doc.url, 60);

    if (urlError || !urlData?.signedUrl) {
      console.warn(`[/api/descargar-zip] no se pudo obtener URL para doc="${doc.id}": ${urlError?.message}`);
      continue;
    }

    let buffer: ArrayBuffer;
    try {
      const res = await fetch(urlData.signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = await res.arrayBuffer();
    } catch (err) {
      console.warn(`[/api/descargar-zip] descarga fallida doc="${doc.id}": ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // Evitar nombres duplicados en el ZIP
    let nombreFinal = doc.nombre;
    if (nombresUsados.has(nombreFinal)) {
      const ext = nombreFinal.includes(".") ? `.${nombreFinal.split(".").pop()}` : "";
      const base = nombreFinal.slice(0, nombreFinal.length - ext.length);
      let contador = 2;
      while (nombresUsados.has(nombreFinal)) {
        nombreFinal = `${base} (${contador})${ext}`;
        contador++;
      }
    }
    nombresUsados.add(nombreFinal);
    zip.file(nombreFinal, buffer);
  }

  if (nombresUsados.size === 0) {
    return Response.json(
      { error: "Error al generar el archivo ZIP." },
      { status: 500 },
    );
  }

  let contenido: Buffer;
  try {
    contenido = await zip.generateAsync({ type: "nodebuffer" });
  } catch (err) {
    console.error(`[/api/descargar-zip] error generando ZIP: ${err instanceof Error ? err.message : String(err)}`);
    return Response.json({ error: "Error al generar el archivo ZIP." }, { status: 500 });
  }

  return new Response(contenido, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="documentos.zip"',
      "Content-Length": String(contenido.length),
    },
  });
}
```

- [ ] **Paso 4: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

Si hay error de tipos con `jszip` (módulo no encontrado), añadir `@types/jszip`:
```bash
npm install --save-dev @types/jszip
```

- [ ] **Paso 5: Commit**

```bash
git add web/src/app/api/descargar-zip/ web/package.json web/package-lock.json
git commit -m "C.5 - endpoint POST /api/descargar-zip para descarga masiva ZIP"
```

---

### Tarea 2: Añadir selección múltiple y barra flotante en `TablaDocumentos`

**Files:**
- Modify: `web/src/app/(app)/mis-documentos/TablaDocumentos.tsx`

- [ ] **Paso 1: Leer el archivo actual**

Lee `web/src/app/(app)/mis-documentos/TablaDocumentos.tsx` completo.

- [ ] **Paso 2: Añadir estado de selección y función de descarga**

En la parte de estado, añadir:

```ts
const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
const [descargando, setDescargando] = useState(false);

const toggleSeleccion = (id: string) => {
  setSeleccionados((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleTodos = () => {
  if (seleccionados.size === filtrados.length) {
    setSeleccionados(new Set());
  } else {
    setSeleccionados(new Set(filtrados.map((d) => d.id)));
  }
};

const descargarSeleccionados = async () => {
  if (seleccionados.size === 0 || descargando) return;
  setDescargando(true);
  try {
    const res = await fetch("/api/descargar-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...seleccionados] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      mostrar({ variant: "err", titulo: data.error ?? "Error al descargar." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documentos.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSeleccionados(new Set());
  } catch (err) {
    mostrar({ variant: "err", titulo: "Error de red al descargar." });
  } finally {
    setDescargando(false);
  }
};
```

- [ ] **Paso 3: Actualizar el grid de la tabla**

Cambiar todas las ocurrencias de la clase de grid:
```
// ANTES:
grid-cols-[44px_1fr_120px_100px_120px_30px]
// DESPUÉS:
grid-cols-[28px_44px_1fr_120px_100px_120px_30px]
```

Hay 3 ocurrencias: cabecera de tabla, cabecera de columnas, y en la fila de datos.

- [ ] **Paso 4: Añadir columna checkbox en la cabecera de columnas**

En el div con `bg-soft` (cabecera de tabla con etiquetas), añadir al inicio como primera celda:

```tsx
{/* Checkbox "seleccionar todo" */}
<div className="flex items-center justify-center">
  <input
    type="checkbox"
    checked={filtrados.length > 0 && seleccionados.size === filtrados.length}
    ref={(el) => {
      if (el) el.indeterminate = seleccionados.size > 0 && seleccionados.size < filtrados.length;
    }}
    onChange={toggleTodos}
    className="w-4 h-4 rounded-[4px] border border-rule accent-accent cursor-pointer"
    aria-label="Seleccionar todos"
  />
</div>
```

- [ ] **Paso 5: Añadir checkbox por fila**

En cada fila de datos, añadir como primera celda (antes del chip de tipo):

```tsx
<div className="flex items-center justify-center">
  <input
    type="checkbox"
    checked={seleccionados.has(doc.id)}
    onChange={() => toggleSeleccion(doc.id)}
    className="w-4 h-4 rounded-[4px] border border-rule accent-accent cursor-pointer"
    aria-label={`Seleccionar ${doc.nombre}`}
  />
</div>
```

- [ ] **Paso 6: Añadir barra flotante de acciones**

Justo antes del cierre del `<div>` principal del componente (fuera del container de la tabla pero dentro del componente), añadir:

```tsx
{/* Barra de descarga masiva */}
{seleccionados.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-card border border-rule rounded-full shadow-[var(--shadow-2)] px-5 py-3 flex items-center gap-4">
    <span className="text-[13px] font-medium">
      {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
    </span>
    <button
      type="button"
      onClick={descargarSeleccionados}
      disabled={descargando}
      className="flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
    >
      {descargando ? "Descargando…" : `Descargar (${seleccionados.size}) ↓`}
    </button>
    <button
      type="button"
      onClick={() => setSeleccionados(new Set())}
      className="text-mute hover:text-ink text-[13px] font-mono transition-colors"
      aria-label="Deseleccionar todo"
    >
      ✕
    </button>
  </div>
)}
```

- [ ] **Paso 7: Limpiar selección al cambiar filtro**

En el `onClick` de los botones de filtro, añadir `setSeleccionados(new Set())`:

```tsx
onClick={() => {
  setFiltro(f.id);
  setSeleccionados(new Set());
}}
```

- [ ] **Paso 8: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 9: Commit + bitácora**

```bash
git add web/src/app/\(app\)/mis-documentos/TablaDocumentos.tsx
git commit -m "C.5 - selección múltiple y descarga ZIP en mis-documentos"
```

Añadir entrada en `implementation-notes.md`:
```
## 2026-05-27 — C.5 Descarga masiva

**Pedido**: Selección múltiple de documentos y descarga como ZIP.

**Decidido por Claude**: jszip (puro JS, sin dependencias nativas). Límite de 20 docs por petición para proteger el servidor. La selección se limpia al cambiar filtro (evitar confusión de qué está seleccionado). Nombres duplicados en ZIP se resuelven con sufijo " (2)", " (3)", etc.

**Cambios**: Ninguno respecto al plan.

**Compromisos**: El ZIP se genera en memoria en el servidor (sin streaming). Aceptable para 20 docs en contexto TFG. En producción habría que hacer streaming.

**A revisar**: Confirmar límite de 20 docs es adecuado. Si los docs son grandes (10 MB cada uno), podrían ser hasta 200 MB en memoria.
```

```bash
git add implementation-notes.md
git commit -m "bitácora: C.5 descarga masiva ZIP"
```

---

## Smoke test manual

1. `/mis-documentos` → verificar checkboxes en cada fila.
2. Seleccionar 3 documentos → aparece barra flotante "3 seleccionados · Descargar (3) ↓ · ✕".
3. Click "Seleccionar todo" → todos seleccionados, checkbox cabecera marcado.
4. Click "Descargar (N) ↓" → descarga de `documentos.zip` en el navegador.
5. Abrir el ZIP → verificar que contiene los documentos correctos.
6. Click ✕ → barra desaparece, checkboxes limpios.
7. Probar con más de 20 docs → toast de error "Máximo 20 documentos".
8. Cambiar filtro → selección se limpia.
