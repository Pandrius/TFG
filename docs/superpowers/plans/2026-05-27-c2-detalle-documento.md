# C.2 — Detalle de documento: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/documentos/[id]` al sistema Esmeralda Biblioteca, añadiendo breadcrumb, reclasificación y acciones en el diseño del sistema.

**Architecture:** Server component con lógica de acceso existente + imports de componentes UI del sistema. `FormularioInvitacion` refactorizado con `Input`/`Button` del sistema. Reclasificación reusa `actualizarConfidencialidad` de mis-documentos sin duplicar código.

**Tech Stack:** Next.js App Router, Server Actions, Tailwind v4, Supabase, componentes UI en `web/src/components/ui/`

---

## Context

El sistema de diseño ya está en `web/src/components/ui/`. Tokens CSS en `web/src/app/globals.css`.

Componentes disponibles para importar:
- `Button` de `@/components/ui/Button`
- `Input` de `@/components/ui/Input`
- `Tag` de `@/components/ui/Tag` — variants: `pub`, `priv`
- `Modal` de `@/components/ui/Modal`
- `ModalHacerPublico` de `@/app/(app)/mis-documentos/ModalHacerPublico`
- `useToast` de `@/components/ui/Toast`
- `Avatar` de `@/components/ui/Avatar`

Server actions existentes a importar:
- `actualizarConfidencialidad` de `@/app/(app)/mis-documentos/acciones`
- `quitarPermiso` de `./acciones`
- La acción de invitación está en `./acciones` como `invitarUsuario`

La ruta `/api/documentos/[id]/url` (GET) ya existe y devuelve redirect a signed URL.

No hay migraciones nuevas.

---

### Tarea 1: Reescribir `page.tsx` al sistema de diseño

**Files:**
- Modify: `web/src/app/(app)/documentos/[id]/page.tsx`

- [ ] **Paso 1: Leer el archivo actual**

Lee `web/src/app/(app)/documentos/[id]/page.tsx` completo.

- [ ] **Paso 2: Reescribir el componente**

Reemplaza el contenido completo con la implementación nueva. Conserva toda la
lógica de datos (fetch del doc, verificación de acceso, fetch de permisos y
perfiles) y añade la UI del sistema:

```tsx
"use client" — NO (es server component)

import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import FormularioInvitacion from "./FormularioInvitacion";
import { quitarPermiso } from "./acciones";
import AccionesClasificacion from "./AccionesClasificacion";

export default async function PaginaDocumento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: doc } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id, probabilidad")
    .eq("id", id)
    .single();

  const tieneAcceso = doc && (doc.user_id === user.id || doc.confidencialidad === 0);
  if (!tieneAcceso) redirect("/mis-documentos");

  const esPropietario = doc.user_id === user.id;
  const esPublico = doc.confidencialidad === 0;
  const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
  const fecha = new Date(doc.fecha).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });
  const tipo = (doc.tipo_archivo ?? "").toUpperCase();

  // Permisos (solo propietario)
  let permisos: { id: string; inv_user_id: string }[] = [];
  const perfilesById: Record<string, { nombre_usuario: string; nombre_completo: string | null }> = {};
  if (esPropietario) {
    const { data: permisosData } = await admin
      .from("Permisos").select("id, inv_user_id").eq("documento_id", id);
    permisos = permisosData ?? [];
    const invitadoIds = permisos.map((p) => p.inv_user_id);
    if (invitadoIds.length > 0) {
      const { data: perfilesData } = await admin
        .from("profiles").select("id, nombre_usuario, nombre_completo").in("id", invitadoIds);
      for (const p of perfilesData ?? []) perfilesById[p.id] = p;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link
        href="/mis-documentos"
        className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1"
      >
        ‹ Mis documentos
      </Link>

      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">
          — tu archivo personal
        </p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em] break-words leading-tight">
          {doc.nombre}
        </h1>
        <p className="text-mute text-[12px] font-mono mt-1.5">
          {tipo || "—"} · {fecha}{kb ? ` · ${kb} KB` : ""}
        </p>
      </div>

      {/* Bloque clasificación + acciones */}
      <div className="rounded-[14px] border border-rule bg-paper p-5 flex flex-col sm:flex-row sm:items-start gap-5">
        {/* Clasificación */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tag variant={esPublico ? "pub" : "priv"}>
              {esPublico ? "Público" : "Privado"}
            </Tag>
          </div>
          {doc.probabilidad !== null && (
            <div className="flex flex-col gap-1">
              <p className="text-mute text-[11px]">
                Confianza del modelo: {Math.round(doc.probabilidad * 100)} %
              </p>
              <div className="h-1 bg-rule rounded-full overflow-hidden w-48">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${Math.round(doc.probabilidad * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 sm:items-end">
          <a href={`/api/documentos/${id}/url`}>
            <Button variant="primary" size="md">
              Descargar
            </Button>
          </a>
          {esPropietario && (
            <AccionesClasificacion
              docId={id}
              nombre={doc.nombre}
              tipo={doc.tipo_archivo ?? ""}
              esPublico={esPublico}
            />
          )}
        </div>
      </div>

      {/* Permisos (solo propietario) */}
      {esPropietario && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
            Permisos de <em className="italic text-accent">acceso</em>
          </h2>

          <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            {permisos.length === 0 ? (
              <p className="px-5 py-6 text-mute text-sm text-center">
                Nadie tiene acceso explícito todavía.
              </p>
            ) : (
              permisos.map((p) => {
                const perfil = perfilesById[p.inv_user_id];
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0"
                  >
                    <Avatar
                      nombreCompleto={perfil?.nombre_completo ?? null}
                      nombreUsuario={perfil?.nombre_usuario ?? ""}
                      avatarUrl={null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">
                        {perfil?.nombre_completo || perfil?.nombre_usuario || "—"}
                      </p>
                      {perfil?.nombre_usuario && (
                        <p className="text-mute text-[11px] font-mono">
                          @{perfil.nombre_usuario}
                        </p>
                      )}
                    </div>
                    <form action={quitarPermiso.bind(null, id, p.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Revocar
                      </Button>
                    </form>
                  </div>
                );
              })
            )}
          </div>

          <FormularioInvitacion documentoId={id} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Paso 3: Crear `AccionesClasificacion.tsx`** (client component para manejar reclasificación)

**Archivo:** `web/src/app/(app)/documentos/[id]/AccionesClasificacion.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ModalHacerPublico } from "@/app/(app)/mis-documentos/ModalHacerPublico";
import { useToast } from "@/components/ui/Toast";
import { actualizarConfidencialidad } from "@/app/(app)/mis-documentos/acciones";

interface Props {
  docId: string;
  nombre: string;
  tipo: string;
  esPublico: boolean;
}

export default function AccionesClasificacion({ docId, nombre, tipo, esPublico }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const hacerPrivado = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", docId);
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  if (esPublico) {
    return (
      <Button
        variant="ghost"
        size="md"
        onClick={hacerPrivado}
        loading={enviando}
      >
        Marcar como privado
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="md" onClick={() => setModalAbierto(true)}>
        Hacer público
      </Button>
      <ModalHacerPublico
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        docId={docId}
        nombre={nombre}
        tipo={tipo}
      />
    </>
  );
}
```

- [ ] **Paso 4: Verificar que no hay errores de TypeScript**

Desde `web/`:
```bash
npx tsc --noEmit
```

Esperado: sin errores relevantes a los archivos modificados.

- [ ] **Paso 5: Commit**

```bash
git add web/src/app/\(app\)/documentos/
git commit -m "C.2 - rediseño detalle documento al sistema Esmeralda"
```

---

### Tarea 2: Redesign `FormularioInvitacion.tsx`

**Files:**
- Modify: `web/src/app/(app)/documentos/[id]/FormularioInvitacion.tsx`

- [ ] **Paso 1: Leer el archivo actual**

Lee `web/src/app/(app)/documentos/[id]/FormularioInvitacion.tsx` completo.
Lee también `web/src/app/(app)/documentos/[id]/acciones.ts` para entender `invitarUsuario`.

- [ ] **Paso 2: Reescribir con componentes del sistema**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { invitarUsuario } from "./acciones";

export default function FormularioInvitacion({ documentoId }: { documentoId: string }) {
  const [username, setUsername] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("documento_id", documentoId);
    fd.append("username", username.trim());
    const res = await invitarUsuario(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setUsername("");
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <Input
        placeholder="Buscar por @usuario…"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={enviando}
        className="flex-1"
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={enviando}
        disabled={!username.trim()}
      >
        Invitar
      </Button>
    </form>
  );
}
```

> **Nota**: Si la firma de `invitarUsuario` en `acciones.ts` no acepta
> `(undefined, FormData)` sino `(previo, FormData)`, adaptar según lo que
> encuentres al leer el archivo.

- [ ] **Paso 3: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 4: Commit + bitácora**

```bash
git add web/src/app/\(app\)/documentos/
git commit -m "C.2 - redesign FormularioInvitacion con componentes del sistema"
```

Añadir entrada en `implementation-notes.md`:
```
## 2026-05-27 — C.2 Detalle de documento

**Pedido**: Rediseño de /documentos/[id] al sistema Esmeralda + reclasificación desde esta página.

**Decidido por Claude**: AccionesClasificacion es un client component separado (no puede mezclar useState con server component). ModalHacerPublico se importa desde mis-documentos sin duplicar. El botón de descarga es un <a> nativo (el endpoint /api/documentos/[id]/url ya maneja el redirect).

**Cambios**: Ninguno respecto al plan.

**Compromisos**: FormularioInvitacion usa e.preventDefault + llamada manual a server action (no useActionState) para poder limpiar el campo tras éxito.

**A revisar**: Confirmar que Avatar "sm" tiene el tamaño correcto (el componente usa size prop).
```

```bash
git add implementation-notes.md
git commit -m "bitácora: C.2 detalle documento"
```

---

## Smoke test manual

1. Ir a `/mis-documentos` → click en "Ver detalle" de un documento privado.
2. Verificar: breadcrumb `‹ Mis documentos`, H1 con nombre, metadata, Tag "Privado".
3. Click "Hacer público" → modal con checkbox → confirmar → tag cambia a "Público", toast OK.
4. Click "Marcar como privado" → directo → toast OK.
5. Si propietario: verificar sección permisos con lista + formulario invitar.
6. Descargar: clic en botón → el navegador inicia descarga o nueva pestaña.
