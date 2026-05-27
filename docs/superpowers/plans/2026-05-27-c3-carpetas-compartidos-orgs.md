# C.3 — Carpetas, compartidos y organizaciones: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/carpetas`, `/carpetas/[id]`, `/compartidos`, `/organizaciones`, `/organizaciones/[id]` al sistema Esmeralda + añadir rename inline de carpetas, quitar documento de carpeta, y "Mover a carpeta" desde `/mis-documentos`.

**Architecture:** Cinco server components rediseñados. Nuevo client component `RenombrarInlineCarpeta`. Nuevo client component `ModalMoverACarpeta`. Nuevas server actions en `carpetas/acciones.ts` y `mis-documentos/acciones.ts`.

**Tech Stack:** Next.js App Router, Server Actions, Tailwind v4, Supabase, componentes UI en `web/src/components/ui/`

---

## Context

Componentes del sistema disponibles:
- `Button`, `Input`, `Tag`, `Modal`, `Avatar` de `@/components/ui/`
- `useToast` de `@/components/ui/Toast`
- Tipo `Resultado` definido en `web/src/app/(app)/mis-documentos/acciones.ts`
- `RenombrarInline` en `mis-documentos/RenombrarInline.tsx` — patrón a seguir para `RenombrarInlineCarpeta`

Tablas BD: `carpetas (id, user_id, nombre)`, `Documentos (id, carpeta_id, ...)`,
`organizaciones (id, user_id, nombre)`, `miembros (id, org_id, user_id, rol)`.

No hay migraciones nuevas.

---

### Tarea 1: Rediseñar `/carpetas/page.tsx`

**Files:**
- Modify: `web/src/app/(app)/carpetas/page.tsx`
- Delete (o dejar vacío y no importar): `web/src/app/(app)/carpetas/FormularioCarpeta.tsx`

- [ ] **Paso 1: Leer archivos actuales**

```
web/src/app/(app)/carpetas/page.tsx
web/src/app/(app)/carpetas/FormularioCarpeta.tsx
web/src/app/(app)/carpetas/acciones.ts
```

- [ ] **Paso 2: Reescribir `page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Button } from "@/components/ui/Button";
import { FormularioInlineCarpeta } from "./FormularioInlineCarpeta";
import { FilaCarpeta } from "./FilaCarpeta";

export default async function PaginaCarpetas() {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: carpetas } = await supabase
    .from("carpetas").select("id, nombre").eq("user_id", user.id).order("nombre");

  const { data: conteos } = await supabase
    .from("Documentos").select("carpeta_id").eq("user_id", user.id).not("carpeta_id", "is", null);

  const conteosPorCarpeta: Record<string, number> = {};
  for (const d of conteos ?? []) {
    if (d.carpeta_id) conteosPorCarpeta[d.carpeta_id] = (conteosPorCarpeta[d.carpeta_id] ?? 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">— organización</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
            Mis <em className="italic text-accent">carpetas</em>
          </h1>
          <p className="text-mute text-[12px] font-mono mt-1">
            {carpetas?.length ?? 0} carpeta{carpetas?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <FormularioInlineCarpeta />

      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        {/* Cabecera tabla */}
        <div className="grid grid-cols-[1fr_100px_100px_80px] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div>Carpeta</div>
          <div>Documentos</div>
          <div></div>
          <div></div>
        </div>

        {!carpetas || carpetas.length === 0 ? (
          <div className="px-5 py-10 text-center text-mute text-sm">
            No tienes carpetas todavía.
          </div>
        ) : (
          carpetas.map((c) => (
            <FilaCarpeta
              key={c.id}
              carpeta={c}
              ndocs={conteosPorCarpeta[c.id] ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 3: Crear `FormularioInlineCarpeta.tsx`** (client component)

**Archivo:** `web/src/app/(app)/carpetas/FormularioInlineCarpeta.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { crearCarpeta } from "./acciones";

export function FormularioInlineCarpeta() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("nombre", nombre.trim());
    const res = await crearCarpeta(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setNombre("");
      setAbierto(false);
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  if (!abierto) {
    return (
      <Button variant="primary" size="md" onClick={() => setAbierto(true)}>
        + Nueva carpeta
      </Button>
    );
  }

  return (
    <form onSubmit={crear} className="flex gap-2">
      <Input
        placeholder="Nombre de la carpeta…"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={100}
        disabled={enviando}
        className="flex-1"
        autoFocus
      />
      <Button type="submit" variant="primary" size="md" loading={enviando} disabled={!nombre.trim()}>
        Crear
      </Button>
      <Button type="button" variant="ghost" size="md" onClick={() => setAbierto(false)} disabled={enviando}>
        Cancelar
      </Button>
    </form>
  );
}
```

- [ ] **Paso 4: Crear `FilaCarpeta.tsx`** (client component con rename inline y delete)

**Archivo:** `web/src/app/(app)/carpetas/FilaCarpeta.tsx`

```tsx
"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { renombrarCarpeta, eliminarCarpeta } from "./acciones";

interface Props {
  carpeta: { id: string; nombre: string };
  ndocs: number;
}

export function FilaCarpeta({ carpeta, ndocs }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(carpeta.nombre);
  const [guardando, setGuardando] = useState(false);
  const { mostrar } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) inputRef.current?.focus();
  }, [editando]);

  const guardar = async () => {
    if (valor.trim() === carpeta.nombre) { setEditando(false); return; }
    setGuardando(true);
    const fd = new FormData();
    fd.append("carpeta_id", carpeta.id);
    fd.append("nombre", valor.trim());
    const res = await renombrarCarpeta(undefined, fd);
    setGuardando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setEditando(false);
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
      setValor(carpeta.nombre);
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar la carpeta "${carpeta.nombre}"? Los documentos quedarán sin carpeta.`)) return;
    const fd = new FormData();
    fd.append("carpeta_id", carpeta.id);
    const res = await eliminarCarpeta(undefined, fd);
    if (res && "error" in res) mostrar({ variant: "err", titulo: res.error });
  };

  return (
    <div className="grid grid-cols-[1fr_100px_100px_80px] items-center px-5 py-3 gap-3 border-b border-rule last:border-b-0 text-[13px]">
      {editando ? (
        <div className="flex gap-1 items-center">
          <input
            ref={inputRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void guardar(); if (e.key === "Escape") { setValor(carpeta.nombre); setEditando(false); } }}
            maxLength={100}
            disabled={guardando}
            className="flex-1 min-w-0 rounded-[6px] border border-accent bg-card px-2 py-1 text-sm focus:outline-none"
          />
          <button type="button" onClick={guardar} disabled={guardando} className="text-accent text-sm font-mono px-1.5">✓</button>
          <button type="button" onClick={() => { setValor(carpeta.nombre); setEditando(false); }} className="text-mute text-sm font-mono px-1.5">✕</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-left font-medium hover:text-accent transition-colors truncate"
          title="Click para renombrar"
        >
          {carpeta.nombre}
        </button>
      )}
      <span className="text-mute font-mono text-[12px]">{ndocs} doc{ndocs !== 1 ? "s" : ""}</span>
      <Link href={`/carpetas/${carpeta.id}`}>
        <Button variant="ghost" size="sm">Ver</Button>
      </Link>
      <form action={eliminar}>
        <Button type="button" variant="ghost" size="sm" onClick={eliminar} className="text-danger hover:text-danger">
          Eliminar
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Paso 5: Actualizar `acciones.ts` — añadir `crearCarpeta` como server action con firma correcta y `renombrarCarpeta`**

Lee el archivo actual primero. Asegúrate de que `crearCarpeta` acepta `(_previo: unknown, datos: FormData)` y devuelve `Promise<Resultado>`. Añade `renombrarCarpeta` y convierte `eliminarCarpeta` si tiene firma diferente:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
export type Resultado = { ok: string } | { error: string } | undefined;

export async function crearCarpeta(_previo: unknown, datos: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre || nombre.length > 100) return { error: "Nombre de carpeta no válido." };
  const admin = crearClienteAdmin();
  const { error } = await admin.from("carpetas").insert({ nombre, user_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Carpeta creada." };
}

export async function renombrarCarpeta(_previo: unknown, datos: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const carpetaId = String(datos.get("carpeta_id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!carpetaId || !nombre || nombre.length > 100) return { error: "Datos no válidos." };
  const admin = crearClienteAdmin();
  const { data: c } = await admin.from("carpetas").select("user_id").eq("id", carpetaId).single();
  if (!c || c.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("carpetas").update({ nombre }).eq("id", carpetaId);
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Carpeta renombrada." };
}

export async function eliminarCarpeta(_previo: unknown, datos: FormData): Promise<Resultado>;
// Si la firma actual es (id: string), adaptar para que también acepte FormData.
// Si ya existe como .bind(null, id), mantener esa forma o convertir. Ver el archivo actual.
```

> **IMPORTANTE**: Lee el archivo actual de `acciones.ts` antes de reescribir.
> Si `eliminarCarpeta` ya existe con forma `(id: string)`, puedes mantener esa
> versión y dejar que `FilaCarpeta` la llame directamente (sin FormData).
> Adapta `FilaCarpeta.tsx` según la firma que encuentres.

- [ ] **Paso 6: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 7: Commit**

```bash
git add web/src/app/\(app\)/carpetas/
git commit -m "C.3 - rediseño /carpetas con rename inline y formulario inline"
```

---

### Tarea 2: Rediseñar `/carpetas/[id]/page.tsx`

**Files:**
- Modify: `web/src/app/(app)/carpetas/[id]/page.tsx`
- Modify: `web/src/app/(app)/carpetas/acciones.ts` (+`quitarDocumentoDeCarpeta`)

- [ ] **Paso 1: Leer archivo actual**

```
web/src/app/(app)/carpetas/[id]/page.tsx
```

- [ ] **Paso 2: Reescribir page.tsx**

```tsx
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { quitarDocumentoDeCarpeta } from "../acciones";

export default async function PaginaCarpeta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: carpeta } = await admin.from("carpetas").select("id, nombre, user_id").eq("id", id).single();
  if (!carpeta || carpeta.user_id !== user.id) notFound();

  const { data: docs } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("carpeta_id", id)
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <Link href="/carpetas" className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1">
        ‹ Carpetas
      </Link>

      <div>
        <p className="font-display italic text-accent text-sm mb-1">— carpeta</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">{carpeta.nombre}</h1>
        <p className="text-mute text-[12px] font-mono mt-1">
          {docs?.length ?? 0} documento{docs?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_120px_100px_120px_auto] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div></div><div>Documento</div><div>Estado</div><div>Tamaño</div><div>Fecha</div><div></div>
        </div>

        {!docs || docs.length === 0 ? (
          <div className="px-5 py-10 text-center text-mute text-sm">
            Esta carpeta está vacía. Mueve documentos desde{" "}
            <Link href="/mis-documentos" className="text-accent hover:underline">Mis documentos</Link>.
          </div>
        ) : (
          docs.map((doc) => {
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = (doc.confidencialidad ?? 1) === 0;
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            return (
              <div key={doc.id} className="grid grid-cols-[44px_1fr_120px_100px_120px_auto] items-center px-5 py-3 gap-3 border-b border-rule last:border-b-0 text-[13px]">
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <Link href={`/documentos/${doc.id}`} className="font-medium hover:text-accent transition-colors truncate">
                  {doc.nombre}
                </Link>
                <Tag variant={esPublico ? "pub" : "priv"}>{esPublico ? "público" : "privado"}</Tag>
                <span className="text-mute font-mono text-[12px]">{kb !== null ? `${kb} KB` : "—"}</span>
                <span className="text-mute font-mono text-[12px]">{fecha}</span>
                <form action={quitarDocumentoDeCarpeta.bind(null, doc.id)}>
                  <Button type="submit" variant="ghost" size="sm">Quitar</Button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 3: Añadir `quitarDocumentoDeCarpeta` a `acciones.ts`**

En `web/src/app/(app)/carpetas/acciones.ts`, añadir al final:

```ts
export async function quitarDocumentoDeCarpeta(docId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const admin = crearClienteAdmin();
  const { data: doc } = await admin.from("Documentos").select("user_id").eq("id", docId).single();
  if (!doc || doc.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("Documentos").update({ carpeta_id: null }).eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath(`/carpetas`);
  return { ok: "Documento quitado de la carpeta." };
}
```

- [ ] **Paso 4: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/\(app\)/carpetas/
git commit -m "C.3 - rediseño /carpetas/[id] con quitar documento"
```

---

### Tarea 3: Rediseñar `/compartidos/page.tsx`

**Files:**
- Modify: `web/src/app/(app)/compartidos/page.tsx`

- [ ] **Paso 1: Leer archivo actual y rediseñar**

Leer `web/src/app/(app)/compartidos/page.tsx`. Preservar toda la lógica de fetch.
Reescribir el JSX al sistema.

```tsx
// Cabecera:
<p className="font-display italic text-accent text-sm mb-1">— acceso compartido</p>
<h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
  Compartidos <em className="italic text-accent">conmigo</em>
</h1>

// Lista en rounded-[14px] border border-rule bg-paper overflow-hidden
// Por fila: tipo chip (w-9 h-11) + nombre (link /documentos/[id]) + autor·fecha·KB + Tag + Descargar (ghost sm <a>)
// Tag variant="pub" si confidencialidad===0, else "priv"
// Descargar: <a href={`/api/documentos/${doc.id}/url`}><Button variant="ghost" size="sm">Descargar</Button></a>

// Estado vacío: py-10 text-center text-mute text-sm
```

- [ ] **Paso 2: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/\(app\)/compartidos/
git commit -m "C.3 - rediseño /compartidos al sistema Esmeralda"
```

---

### Tarea 4: Rediseñar `/organizaciones` y `/organizaciones/[id]`

**Files:**
- Modify: `web/src/app/(app)/organizaciones/page.tsx`
- Modify: `web/src/app/(app)/organizaciones/[id]/page.tsx`
- Modify: `web/src/app/(app)/organizaciones/[id]/FormularioMiembro.tsx`
- Modify: `web/src/app/(app)/organizaciones/acciones.ts` (si la firma de crearOrganizacion necesita ajuste)

- [ ] **Paso 1: Leer archivos actuales**

Leer los 4 archivos listados.

- [ ] **Paso 2: Reescribir `/organizaciones/page.tsx`**

Patrón idéntico a `/carpetas/page.tsx`:
- Eyebrow `— equipos`, H1 `*Organizaciones*`.
- Botón `+ Nueva organización` que abre formulario inline.
- Formulario inline con `Input` + `Button`.
- Lista con nombre (link a `/organizaciones/[id]`) + conteo miembros + botón Eliminar.
- El formulario y la lógica de "Eliminar" usan las server actions existentes
  (leer `acciones.ts` primero para ver firmas).

- [ ] **Paso 3: Reescribir `/organizaciones/[id]/page.tsx`**

Patrón idéntico a `/carpetas/[id]/page.tsx`:
- Breadcrumb `‹ Organizaciones`.
- H1: nombre de la organización.
- Lista de miembros: Avatar sm + nombre + @username + Tag con rol + botón "Revocar".
- `FormularioMiembro` rediseñado abajo.

- [ ] **Paso 4: Reescribir `FormularioMiembro.tsx`**

Usar `Input` + `Button` del sistema. Leer el archivo actual para entender la
server action que llama (`invitarMiembro` o similar).

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
// Importar la server action existente para invitar miembro

export default function FormularioMiembro({ orgId }: { orgId: string }) {
  const [username, setUsername] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();
  // ... misma lógica que FormularioInvitacion de documentos
}
```

- [ ] **Paso 5: TypeScript check + commit**

```bash
cd web && npx tsc --noEmit
git add web/src/app/\(app\)/organizaciones/
git commit -m "C.3 - rediseño /organizaciones al sistema Esmeralda"
```

---

### Tarea 5: Añadir "Mover a carpeta" en `/mis-documentos`

**Files:**
- Modify: `web/src/app/(app)/mis-documentos/page.tsx`
- Modify: `web/src/app/(app)/mis-documentos/TablaDocumentos.tsx`
- Modify: `web/src/app/(app)/mis-documentos/acciones.ts`
- Create: `web/src/app/(app)/mis-documentos/ModalMoverACarpeta.tsx`

- [ ] **Paso 1: Leer archivos actuales**

Leer `mis-documentos/page.tsx`, `mis-documentos/TablaDocumentos.tsx` y `mis-documentos/acciones.ts`.

- [ ] **Paso 2: Añadir `moverDocumentoACarpeta` a `acciones.ts`**

```ts
export async function moverDocumentoACarpeta(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const docId = String(datos.get("doc_id") ?? "");
  const carpetaId = String(datos.get("carpeta_id") ?? "") || null;
  if (!docId) return { error: "Documento no válido." };
  const admin = crearClienteAdmin();
  const { data: doc } = await admin.from("Documentos").select("user_id").eq("id", docId).single();
  if (!doc || doc.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("Documentos").update({ carpeta_id: carpetaId }).eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath("/mis-documentos");
  return { ok: carpetaId ? "Documento movido a la carpeta." : "Documento sin carpeta." };
}
```

- [ ] **Paso 3: Crear `ModalMoverACarpeta.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { moverDocumentoACarpeta } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: string;
  nombre: string;
  carpetas: { id: string; nombre: string }[];
}

export function ModalMoverACarpeta({ abierto, onClose, docId, nombre, carpetas }: Props) {
  const [carpetaId, setCarpetaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const mover = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", docId);
    fd.append("carpeta_id", carpetaId);
    const res = await moverDocumentoACarpeta(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      onClose();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo="Mover a carpeta"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={mover}>Mover</Button>
        </>
      }
    >
      <p className="text-mute text-[13px] mb-4">
        Mover <span className="font-medium text-ink">{nombre}</span> a:
      </p>
      <select
        value={carpetaId}
        onChange={(e) => setCarpetaId(e.target.value)}
        className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
      >
        <option value="">Sin carpeta</option>
        {carpetas.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
    </Modal>
  );
}
```

- [ ] **Paso 4: Actualizar `mis-documentos/page.tsx`** para pasar carpetas a `TablaDocumentos`

En la función del server component, añadir query de carpetas:

```ts
const { data: carpetas } = await supabase
  .from("carpetas")
  .select("id, nombre")
  .eq("user_id", user.id)
  .order("nombre");
```

Y pasar al componente: `<TablaDocumentos documentos={...} carpetas={carpetas ?? []} />`.

- [ ] **Paso 5: Actualizar `TablaDocumentos.tsx`**

Añadir prop `carpetas`, estado `modalMover`, opción en menú ⋯, y render de `ModalMoverACarpeta`:

```ts
// En la interfaz Props:
carpetas: { id: string; nombre: string }[];

// En el estado:
const [modalMover, setModalMover] = useState<DocumentoFila | null>(null);

// En el menú ⋯, después de "Ver detalle":
<button
  type="button"
  onClick={() => { setModalMover(doc); setMenuAbierto(null); }}
  className="block w-full text-left px-3 py-1.5 text-[13px] hover:bg-soft"
>
  Mover a carpeta
</button>

// Al final, junto a los otros modales:
{modalMover && (
  <ModalMoverACarpeta
    abierto={modalMover !== null}
    onClose={() => setModalMover(null)}
    docId={modalMover.id}
    nombre={modalMover.nombre}
    carpetas={carpetas}
  />
)}
```

- [ ] **Paso 6: TypeScript check + commit + bitácora**

```bash
cd web && npx tsc --noEmit
git add web/src/app/\(app\)/mis-documentos/
git commit -m "C.3 - añadir mover a carpeta en mis-documentos"
```

Añadir entrada en `implementation-notes.md`:
```
## 2026-05-27 — C.3 Carpetas, compartidos, organizaciones

**Pedido**: Rediseño de /carpetas, /carpetas/[id], /compartidos, /organizaciones, /organizaciones/[id] + "Mover a carpeta".

**Decidido por Claude**: FilaCarpeta es client component separado para manejar estado de rename inline. quitarDocumentoDeCarpeta usa .bind(null, docId) por ser server action directa. ModalMoverACarpeta recibe carpetas como prop desde page.tsx (evita fetch desde cliente).

**Cambios**: Ninguno relevante respecto al plan.

**Compromisos**: Eliminar carpeta usa window.confirm nativo (simple para TFG, sin modal propio).

**A revisar**: Confirmar que eliminar carpeta con documentos deja los docs con carpeta_id=null (comportamiento esperado según spec).
```

```bash
git add implementation-notes.md
git commit -m "bitácora: C.3 carpetas y organizaciones"
```

---

## Smoke test manual

1. `/carpetas` → crear carpeta → aparece en lista → rename inline → eliminar.
2. `/carpetas/[id]` → ver docs → quitar uno → doc desaparece de la carpeta.
3. `/mis-documentos` → menú ⋯ → "Mover a carpeta" → seleccionar → documento aparece en carpeta.
4. `/compartidos` → verificar lista de docs compartidos con el diseño nuevo.
5. `/organizaciones` → crear org → ir a detalle → invitar miembro (si hay otro usuario).
