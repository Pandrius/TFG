# C.4 — Explorar y usuarios: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/explorar` y `/usuarios` al sistema Esmeralda Biblioteca preservando toda la funcionalidad existente (búsqueda full-text, feed público, favoritos, bloqueos).

**Architecture:** Ambas pantallas son server components. Botones de favorito/bloqueo usan `<form action={serverAction.bind(null, id)}>` (patrón existente). No hay client components nuevos.

**Tech Stack:** Next.js App Router, Server Actions, Tailwind v4, Supabase, componentes UI en `web/src/components/ui/`

---

## Context

Componentes del sistema:
- `Button` de `@/components/ui/Button`
- `Input` de `@/components/ui/Input`
- `Tag` de `@/components/ui/Tag` — variants `pub`, `priv`
- `Avatar` de `@/components/ui/Avatar`

La búsqueda en `/explorar` usa `searchParams.q` con un `<form method="GET">`.
La búsqueda en `/usuarios` usa `searchParams.buscar`.
Las server actions `alternarFavorito`, `alternarBloqueo` están en `usuarios/acciones.ts`.
RPC `buscar_documentos` ya existe en Supabase.

No hay migraciones nuevas. No hay client components nuevos.

---

### Tarea 1: Rediseñar `/explorar/page.tsx`

**Files:**
- Modify: `web/src/app/(app)/explorar/page.tsx`

- [ ] **Paso 1: Leer el archivo actual**

```
web/src/app/(app)/explorar/page.tsx
```

- [ ] **Paso 2: Reescribir con el sistema de diseño**

Preservar toda la lógica de fetch (auth check, búsqueda, feed, perfiles).
Reescribir únicamente el JSX:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Tag";

const ETIQUETA_TIPO: Record<string, string> = {
  pdf: "PDF", docx: "DOC", xlsx: "XLS", csv: "CSV", pptx: "PPT", txt: "TXT",
};

// ... (mantener el tipo Doc y la lógica de fetch igual) ...

export default async function PaginaExplorar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // ... (lógica de fetch sin cambios) ...

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— explorar</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          Documentos <em className="italic text-accent">públicos</em>
        </h1>
        <p className="text-mute text-[13px] mt-1">
          {termino
            ? `${documentos.length} resultado${documentos.length !== 1 ? "s" : ""} para "${termino}"`
            : "Busca entre los documentos que la comunidad ha compartido."}
        </p>
      </div>

      {/* Buscador */}
      <form method="GET" className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={termino}
          placeholder="Buscar documentos…"
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="md">Buscar</Button>
        {termino && (
          <a href="/explorar">
            <Button type="button" variant="ghost" size="md">Limpiar</Button>
          </a>
        )}
      </form>

      {/* Resultados */}
      {documentos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display italic text-accent text-lg mb-1">Sin resultados</p>
          <p className="text-mute text-sm">
            {termino ? "Prueba con otro término de búsqueda." : "No hay documentos públicos disponibles."}
          </p>
        </div>
      ) : termino ? (
        /* Lista para resultados de búsqueda */
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = doc.user_id === user.id ? "Tú" : (perfil?.nombre_completo || perfil?.nombre_usuario || "—");
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = doc.confidencialidad === 0;

            return (
              <div
                key={doc.id}
                className="grid grid-cols-[44px_1fr_120px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
              >
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/documentos/${doc.id}`}
                    className="font-medium hover:text-accent transition-colors truncate block"
                  >
                    {doc.nombre}
                  </Link>
                  <p className="text-mute text-[11px] font-mono mt-0.5">
                    {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                </div>
                <Tag variant={esPublico ? "pub" : "priv"}>
                  {esPublico ? "público" : "privado"}
                </Tag>
                <a href={`/api/documentos/${doc.id}/url`}>
                  <Button variant="ghost" size="sm">Descargar</Button>
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid de tarjetas para el feed sin búsqueda */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = doc.user_id === user.id ? "Tú" : (perfil?.nombre_completo || perfil?.nombre_usuario || "—");
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();

            return (
              <div
                key={doc.id}
                className="rounded-[14px] border border-rule bg-paper p-4 flex gap-4 items-start"
              >
                <span className="w-10 h-12 shrink-0 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[12px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/documentos/${doc.id}`}
                    className="font-display font-medium text-[15px] hover:text-accent transition-colors truncate block leading-snug"
                  >
                    {doc.nombre}
                  </Link>
                  <p className="text-mute text-[11px] font-mono mt-0.5 mb-3">
                    {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Tag variant="pub">público</Tag>
                    <a href={`/api/documentos/${doc.id}/url`} className="ml-auto">
                      <Button variant="ghost" size="sm">Descargar</Button>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 3: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add web/src/app/\(app\)/explorar/
git commit -m "C.4 - rediseño /explorar al sistema Esmeralda"
```

---

### Tarea 2: Rediseñar `/usuarios/page.tsx`

**Files:**
- Modify: `web/src/app/(app)/usuarios/page.tsx`

- [ ] **Paso 1: Leer el archivo actual**

```
web/src/app/(app)/usuarios/page.tsx
web/src/app/(app)/usuarios/acciones.ts
```

- [ ] **Paso 2: Reescribir con el sistema de diseño**

Preservar toda la lógica (auth, fetch favoritos/bloqueos, búsqueda de perfiles).
Reescribir el JSX.

La función `FavoritosActuales` puede mantenerse como función separada o integrarse.
Los botones de favorito/bloqueo mantienen su patrón `<form action={fn.bind(null, id)}>`.

```tsx
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { alternarFavorito, alternarBloqueo } from "./acciones";

// ... (mantener la lógica de fetch igual) ...

export default async function PaginaUsuarios({ searchParams }: ...) {
  // ... (fetch sin cambios) ...

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— comunidad</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          <em className="italic text-accent">Usuarios</em>
        </h1>
      </div>

      {/* Buscador */}
      <form method="GET" className="flex gap-2">
        <Input
          type="search"
          name="buscar"
          defaultValue={buscar ?? ""}
          placeholder="Buscar por nombre o @usuario…"
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="md">Buscar</Button>
        {buscar && (
          <a href="/usuarios">
            <Button type="button" variant="ghost" size="md">Limpiar</Button>
          </a>
        )}
      </form>

      {/* Resultados de búsqueda */}
      {buscar && buscar.trim().length >= 2 && (
        <section className="flex flex-col gap-3">
          <p className="text-mute text-[12px] font-mono">
            Resultados ({resultados.length})
          </p>
          {resultados.length > 0 ? (
            <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
              {resultados.map((u) => {
                const esFavorito = favoritosIds.has(u.id);
                const estaBloqueado = bloqueadosIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0"
                  >
                    <Avatar
                      nombreCompleto={u.nombre_completo}
                      nombreUsuario={u.nombre_usuario}
                      avatarUrl={null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">
                        {u.nombre_completo || u.nombre_usuario}
                      </p>
                      <p className="text-mute text-[11px] font-mono">
                        @{u.nombre_usuario}
                      </p>
                    </div>
                    <form action={alternarFavorito.bind(null, u.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={esFavorito ? "text-accent bg-accent-tint border-accent-soft" : ""}
                      >
                        {esFavorito ? "Quitar favorito" : "Favorito"}
                      </Button>
                    </form>
                    <form action={alternarBloqueo.bind(null, u.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={estaBloqueado ? "text-danger bg-danger-tint border-danger-soft" : ""}
                      >
                        {estaBloqueado ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-mute text-sm">No se encontraron usuarios.</p>
          )}
        </section>
      )}

      {/* Mis favoritos */}
      {favoritosIds.size > 0 && (
        <FavoritosActuales ids={[...favoritosIds]} />
      )}
    </div>
  );
}

async function FavoritosActuales({ ids }: { ids: string[] }) {
  const supabase = await (await import("@/lib/supabase/servidor")).crearClienteServidor();
  const { data: perfiles } = await supabase
    .from("profiles").select("id, nombre_usuario, nombre_completo").in("id", ids);
  if (!perfiles?.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <p className="text-mute text-[12px] font-mono uppercase tracking-wider">Mis favoritos</p>
      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        {perfiles.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0">
            <Avatar
              nombreCompleto={u.nombre_completo}
              nombreUsuario={u.nombre_usuario}
              avatarUrl={null}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px]">{u.nombre_completo || u.nombre_usuario}</p>
              <p className="text-mute text-[11px] font-mono">@{u.nombre_usuario}</p>
            </div>
            <form action={alternarFavorito.bind(null, u.id)}>
              <Button type="submit" variant="ghost" size="sm" className="text-accent bg-accent-tint border-accent-soft">
                Quitar favorito
              </Button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Paso 3: TypeScript check**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 4: Commit + bitácora**

```bash
git add web/src/app/\(app\)/usuarios/
git commit -m "C.4 - rediseño /usuarios al sistema Esmeralda"
```

Añadir entrada en `implementation-notes.md`:
```
## 2026-05-27 — C.4 Explorar y usuarios

**Pedido**: Rediseño de /explorar y /usuarios al sistema Esmeralda Biblioteca.

**Decidido por Claude**: /explorar muestra grid de tarjetas sin búsqueda y lista de filas con búsqueda (más scannable). Los botones de favorito/bloqueo conservan su patrón <form action={fn.bind(null, id)}> (sin useActionState) para no re-arquitectar. Avatar sin foto real (el modelo profiles no expone avatar_url aquí; se usa inicial del nombre como fallback).

**Cambios**: Ninguno respecto al plan.

**Compromisos**: No se añade paginación (muestra 100 más recientes — suficiente para TFG).

**A revisar**: Si se quiere mostrar foto de avatar del usuario en /usuarios, habría que hacer join con Storage bucket avatares.
```

```bash
git add implementation-notes.md
git commit -m "bitácora: C.4 explorar y usuarios"
```

---

## Smoke test manual

1. `/explorar` sin búsqueda → grid de tarjetas con documentos públicos de otros usuarios.
2. `/explorar?q=informe` → lista de resultados con buscador activo + botón Limpiar.
3. `/explorar` sin docs → estado vacío "Sin resultados".
4. `/usuarios` → buscador vacío.
5. `/usuarios?buscar=test` → resultados con botones Favorito/Bloquear.
6. Marcar favorito → aparece en sección "Mis favoritos".
