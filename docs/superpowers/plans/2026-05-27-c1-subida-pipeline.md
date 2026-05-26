# C.1 — Subida + pipeline + reclasificar + /mis-documentos · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar tarea-a-tarea. Steps usan checkbox (`- [ ]`).

**Goal:** Implementar el corazón funcional del producto — multi-upload paralelo con pipeline visible por archivo, reclasificación manual con modal de aviso al hacer público, CRUD básico de documentos (renombrar inline + eliminar), y rediseño completo de `/mis-documentos` y `/inicio` aplicando el sistema Esmeralda biblioteca.

**Architecture:** Multi-upload con **cola en cliente con concurrencia 3** (límite 10 por tanda), reutilizando el endpoint SSE existente `/api/subir` sin cambios — el cliente abre N conexiones SSE en paralelo. Reclasificar es UPDATE simple via server action. CRUD via server actions. Toda la UI nueva usa los componentes UI base del sub-proyecto B (Button, Modal, Toast, FormField, Input, Tag) + lote nuevo (`Kpi`, `KpiAnillo`, `StageChip`, `PipelineRow`, `DropZone`).

**Tech Stack:** Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5, Tailwind v4, Supabase (Storage + RLS). Sin librerías nuevas.

**Spec asociada:** `docs/superpowers/specs/2026-05-27-c1-subida-pipeline-design.md`

---

## Estructura de ficheros

### Nuevos

```
docs/superpowers/plans/2026-05-27-c1-subida-pipeline.md   (este fichero)

web/src/components/ui/Kpi.tsx
web/src/components/ui/KpiAnillo.tsx
web/src/components/ui/StageChip.tsx
web/src/components/ui/DropZone.tsx
web/src/components/ui/PipelineRow.tsx

web/src/app/(app)/mis-documentos/acciones.ts
web/src/app/(app)/mis-documentos/PanelSubidas.tsx
web/src/app/(app)/mis-documentos/RenombrarInline.tsx
web/src/app/(app)/mis-documentos/ModalHacerPublico.tsx
web/src/app/(app)/mis-documentos/ModalEliminar.tsx
web/src/app/(app)/mis-documentos/TablaDocumentos.tsx
```

### Modificados

```
web/src/app/(app)/mis-documentos/page.tsx     reescritura completa
web/src/app/(app)/inicio/page.tsx             reescritura completa
```

### Eliminados

```
web/src/components/SubidaArchivos.tsx         reemplazado por PanelSubidas
```

---

## Tarea C1-01 — Componentes `Kpi` y `KpiAnillo`

**Files:**
- Create: `web/src/components/ui/Kpi.tsx`
- Create: `web/src/components/ui/KpiAnillo.tsx`

**Steps:**

- [ ] **Paso 1: Crear `web/src/components/ui/KpiAnillo.tsx`**

```tsx
interface Props {
  /** Porcentaje 0..100 a rellenar. */
  porcentaje: number;
}

/** Anillo conic-gradient que muestra un porcentaje (0..100) en el color accent. */
export function KpiAnillo({ porcentaje }: Props) {
  const p = Math.max(0, Math.min(100, porcentaje));
  return (
    <div
      className="relative w-9 h-9 rounded-full grid place-items-center"
      style={{
        background: `conic-gradient(var(--accent) ${p}%, var(--accent-soft) 0)`,
      }}
      aria-hidden
    >
      <div className="w-[26px] h-[26px] rounded-full bg-paper grid place-items-center">
        <span className="font-mono text-[10px] font-medium text-accent">
          {Math.round(p)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Crear `web/src/components/ui/Kpi.tsx`**

```tsx
import type { ReactNode } from "react";

interface Props {
  /** Etiqueta en Fraunces italic, encima del valor. */
  label: string;
  /** Valor grande. Puede ser número, string formateado o JSX (para resaltar). */
  valor: ReactNode;
  /** Texto pequeño bajo el valor (descripción del KPI). */
  pista?: string;
  /** Texto pequeño en accent a la derecha del pista (e.g. "+3 hoy"). */
  delta?: string;
  /** Slot a la derecha para `KpiAnillo` u otro indicador visual. */
  visual?: ReactNode;
}

export function Kpi({ label, valor, pista, delta, visual }: Props) {
  return (
    <div className="relative rounded-[14px] border border-rule bg-paper px-[18px] py-4">
      <div className="font-display italic text-[13px] text-mute mb-1.5">
        {label}
      </div>
      <div className="font-display text-[30px] font-medium tracking-[-0.02em] leading-none">
        {valor}
      </div>
      {(pista || delta) && (
        <div className="flex justify-between items-center mt-2 text-xs text-mute">
          {pista && <span>{pista}</span>}
          {delta && (
            <span className="font-mono text-[11px] text-accent">{delta}</span>
          )}
        </div>
      )}
      {visual && <div className="absolute top-4 right-4">{visual}</div>}
    </div>
  );
}
```

- [ ] **Paso 3: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

Esperado: 0 errores.

- [ ] **Paso 4: Actualizar bitácora y commit**

Añade al final de `implementation-notes.md`:

```
---

## 2026-05-27 — C1-01: Componentes Kpi y KpiAnillo

**Pedido**
- Componentes reutilizables para mostrar KPIs (label + valor + pista/delta opcional + slot visual).
- KpiAnillo: ronda conic-gradient con porcentaje en el color accent.

**Decidido por Claude** — Ninguna decisión discrecional. Diseño tomado del sistema.
**Cambios** — Ninguno.
**Compromisos** — KpiAnillo usa SVG implícito vía conic-gradient (CSS puro, sin librería). Buena resolución a 36×36 px; si crece más habría que migrar a SVG real.
**A revisar** — Verificación visual al usarse en /mis-documentos (C1-10).

Verificación: npx tsc --noEmit → 0 errores.
```

Sin SHA. Commit:

```bash
git add web/src/components/ui/Kpi.tsx web/src/components/ui/KpiAnillo.tsx implementation-notes.md
git commit -m "C1-01: componentes Kpi y KpiAnillo"
```

Verificar con `git show --stat HEAD` que los 3 ficheros están dentro.

## Tarea C1-02 — Componente `StageChip`

**Files:**
- Create: `web/src/components/ui/StageChip.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
import type { ReactNode } from "react";

type Estado = "pending" | "done" | "now" | "err";

interface Props {
  estado: Estado;
  children: ReactNode;
}

const claseEstado: Record<Estado, string> = {
  pending: "bg-soft text-mute border border-rule",
  done: "bg-accent-soft text-accent",
  now: "bg-ink text-paper",
  err: "bg-danger-soft text-danger",
};

/** Chip de fase del pipeline (4 estados: pendiente, hecho, ahora, error). */
export function StageChip({ estado, children }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5",
        "font-mono text-[10px]",
        claseEstado[estado],
      ].join(" ")}
    >
      <span
        className={[
          "w-[5px] h-[5px] rounded-full bg-current",
          estado === "now" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
      {children}
    </span>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-02: Componente StageChip

**Pedido**
- Chip pequeño para mostrar el estado de una fase del pipeline (4 variantes: pending/done/now/err) con dot que pulsa en "now".

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** — Ninguno.
**A revisar** — Verificación al integrarse en PipelineRow (C1-04).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add web/src/components/ui/StageChip.tsx implementation-notes.md
git commit -m "C1-02: componente StageChip"
```

---

## Tarea C1-03 — Componente `DropZone`

**Files:**
- Create: `web/src/components/ui/DropZone.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";

interface Props {
  /** Callback con los ficheros seleccionados (drop o picker). */
  onArchivos: (archivos: File[]) => void;
  /** Tipos MIME / extensiones aceptadas (separadas por coma). */
  accept?: string;
  /** Permite seleccionar varios ficheros a la vez. */
  multiple?: boolean;
  /** Deshabilita interacción cuando true. */
  disabled?: boolean;
  /** Slot del contenido visual (icono + textos). */
  children: ReactNode;
}

/** Área draggable reutilizable. Captura drop y click → file picker. */
export function DropZone({
  onArchivos,
  accept,
  multiple = false,
  disabled = false,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const elegir = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    onArchivos(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      onClick={elegir}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          elegir();
        }
      }}
      className={[
        "rounded-[14px] border-2 border-dashed p-8 text-center transition-colors",
        "select-none cursor-pointer outline-none",
        "focus-visible:ring-3 focus-visible:ring-accent-tint",
        disabled
          ? "border-rule opacity-50 cursor-not-allowed"
          : hover
          ? "border-accent bg-accent-tint"
          : "border-rule bg-paper hover:border-accent-soft-hover",
      ].join(" ")}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const lista = Array.from(e.target.files ?? []);
          e.target.value = "";
          onArchivos(lista);
        }}
      />
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-03: Componente DropZone

**Pedido**
- Área draggable reutilizable: drop + click → file picker, multiple opcional, disabled, accept.
- Estados visuales: idle, hover, disabled.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** — Sin barra de progreso interna; eso lo gestiona quien la usa (PanelSubidas).
**A revisar** — Verificación al integrarse en PanelSubidas (C1-06).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add web/src/components/ui/DropZone.tsx implementation-notes.md
git commit -m "C1-03: componente DropZone"
```

---

## Tarea C1-04 — Componente `PipelineRow`

**Files:**
- Create: `web/src/components/ui/PipelineRow.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import type { ReactNode } from "react";
import { StageChip } from "./StageChip";

export type EstadoArchivo =
  | "en_cola"
  | "subido"
  | "texto"
  | "analizando"
  | "guardado"
  | "listo"
  | "error";

interface Props {
  /** Tipo de archivo (PDF, DOC, ...). Se muestra como icono. */
  tipo: string;
  /** Nombre del archivo. */
  nombre: string;
  /** Estado actual del archivo. */
  estado: EstadoArchivo;
  /** Progreso 0..100. */
  progreso: number;
  /** Mensaje de error (visible solo si estado === "error"). */
  error?: string;
  /** Acción "Cancelar" disponible solo si estado === "en_cola". */
  onCancelar?: () => void;
  /** Acción "Reintentar" disponible solo si estado === "error". */
  onReintentar?: () => void;
  /** Acción "Quitar" disponible cuando no está procesando. */
  onQuitar?: () => void;
  /** Cuando true, fade-out CSS antes de unmount. */
  saliendo?: boolean;
}

const ORDEN_STAGE: Record<EstadoArchivo, number> = {
  en_cola: -1,
  subido: 0,
  texto: 1,
  analizando: 2,
  guardado: 3,
  listo: 4,
  error: -1,
};

const ETIQUETA_STAGES = ["subido", "texto", "analizando", "guardado"] as const;

/** Fila de un archivo en proceso o ya completado, con 4 stages, barra y acciones. */
export function PipelineRow({
  tipo,
  nombre,
  estado,
  progreso,
  error,
  onCancelar,
  onReintentar,
  onQuitar,
  saliendo,
}: Props) {
  const idxActual = ORDEN_STAGE[estado];
  const esError = estado === "error";
  const esListo = estado === "listo";

  return (
    <div
      className={[
        "grid grid-cols-[36px_1fr_auto] gap-3.5 items-center",
        "py-3 border-b border-dashed border-rule last:border-b-0",
        "transition-opacity duration-500",
        saliendo ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <Icono tipo={tipo} />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{nombre}</div>
        <div className="flex gap-1 items-center mt-1.5 flex-wrap">
          {esError ? (
            <StageChip estado="err">error</StageChip>
          ) : (
            ETIQUETA_STAGES.map((label, i) => {
              const e =
                i < idxActual ? "done" : i === idxActual ? "now" : "pending";
              return (
                <StageChip key={label} estado={e}>
                  {label}
                </StageChip>
              );
            })
          )}
        </div>
        {esError && error && (
          <div className="text-xs text-danger mt-1.5">{error}</div>
        )}
        <div className="h-1 bg-soft rounded-full overflow-hidden mt-2">
          <div
            className={[
              "h-full rounded-full transition-[width] duration-300",
              esError ? "bg-danger" : "bg-accent",
            ].join(" ")}
            style={{ width: `${esError ? 50 : progreso}%` }}
          />
        </div>
      </div>
      <Acciones
        estado={estado}
        progreso={progreso}
        onCancelar={onCancelar}
        onReintentar={onReintentar}
        onQuitar={onQuitar}
        esListo={esListo}
        esError={esError}
      />
    </div>
  );
}

function Icono({ tipo }: { tipo: string }) {
  return (
    <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[13px]">
      {tipo.slice(0, 3).toUpperCase()}
    </span>
  );
}

function Acciones({
  estado,
  progreso,
  onCancelar,
  onReintentar,
  onQuitar,
  esListo,
  esError,
}: {
  estado: EstadoArchivo;
  progreso: number;
  onCancelar?: () => void;
  onReintentar?: () => void;
  onQuitar?: () => void;
  esListo: boolean;
  esError: boolean;
}): ReactNode {
  if (estado === "en_cola") {
    return (
      <button
        type="button"
        onClick={onCancelar}
        className="text-mute hover:text-ink text-xs font-mono"
      >
        ✕ cancelar
      </button>
    );
  }
  if (esListo) {
    return (
      <span className="font-mono text-xs text-accent">✓ listo</span>
    );
  }
  if (esError) {
    return (
      <div className="flex gap-2">
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="text-accent hover:text-accent-hover text-xs font-mono"
          >
            reintentar
          </button>
        )}
        {onQuitar && (
          <button
            type="button"
            onClick={onQuitar}
            className="text-mute hover:text-ink text-xs font-mono"
          >
            quitar
          </button>
        )}
      </div>
    );
  }
  return (
    <span className="font-mono text-xs text-mute">{Math.round(progreso)}%</span>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-04: Componente PipelineRow

**Pedido**
- Fila de un archivo en pipeline: icono + nombre + 4 StageChips + barra de progreso + acción contextual (cancelar/reintentar/quitar).
- 7 estados: en_cola, subido, texto, analizando, guardado, listo, error.

**Decidido por Claude**
- Estado "en_cola" no muestra ningún chip activo (todos pending); estado "listo" todos done; "error" reemplaza los stages por un solo chip rojo.
- Iconos del tipo de archivo = 3 letras del tipo (PDF, DOC, XLS...). Sin SVG por simplicidad.

**Cambios** — Ninguno.
**Compromisos** — La barra de progreso en estado "error" se queda al 50% en color danger; alternativa sería marcarla al 100% rojo. Esta queda sutil.
**A revisar** — Verificación al integrarse en PanelSubidas (C1-06).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add web/src/components/ui/PipelineRow.tsx implementation-notes.md
git commit -m "C1-04: componente PipelineRow"
```

---

## Tarea C1-05 — Server actions de documentos

**Files:**
- Create: `web/src/app/(app)/mis-documentos/acciones.ts`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```ts
"use server";

import { revalidatePath } from "next/cache";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado =
  | { ok: string }
  | { error: string }
  | undefined;

/**
 * Cambia la confidencialidad de un documento del usuario.
 * 0 = público, 1 = privado.
 */
export async function actualizarConfidencialidad(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = Number(datos.get("doc_id"));
  const nueva = Number(datos.get("nueva"));
  if (!Number.isFinite(docId) || (nueva !== 0 && nueva !== 1)) {
    return { error: "Datos no válidos." };
  }

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ confidencialidad: nueva })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return {
    ok: nueva === 0 ? "Documento marcado como público." : "Documento marcado como privado.",
  };
}

/** Renombra un documento del usuario. */
export async function renombrarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = Number(datos.get("doc_id"));
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!Number.isFinite(docId)) return { error: "Documento no válido." };
  if (!nombre) return { error: "El nombre no puede estar vacío." };
  if (nombre.length > 200) return { error: "Máximo 200 caracteres." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ nombre })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Nombre actualizado." };
}

/** Elimina un documento del usuario (storage + BD). */
export async function eliminarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = Number(datos.get("doc_id"));
  if (!Number.isFinite(docId)) return { error: "Documento no válido." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id, url")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  // Borrar el fichero del bucket (best-effort: si falla, igualmente borramos el registro
  // para no dejar al usuario con un documento que no puede gestionar).
  await admin.storage.from("almacen_documentos").remove([doc.url]);

  const { error } = await admin.from("Documentos").delete().eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Documento eliminado." };
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-05: Server actions de documentos

**Pedido**
- actualizarConfidencialidad(doc_id, nueva) — cambia 0/1.
- renombrarDocumento(doc_id, nombre).
- eliminarDocumento(doc_id) — borra storage + BD.

**Decidido por Claude**
- Tipo Resultado local al fichero (no se extrae a lib compartida hasta que C.2 lo necesite). Cuando aparezca en otro sitio, se mueve.
- Verificación de propiedad explícita en código (SELECT user_id FROM Documentos) en lugar de delegar en RLS, por coherencia con el patrón del proyecto y para devolver mensajes claros ("No autorizado.").
- Eliminar es best-effort en storage: si el fichero ya no existe o storage falla, se borra igualmente el registro de BD para no dejar al usuario con documento huérfano que no pueda gestionar.

**Cambios** — Ninguno.
**Compromisos** — Best-effort en borrado de storage (ver arriba). Si en producción aparecen objetos huérfanos en el bucket, se puede añadir un cron de limpieza.
**A revisar** — Verificación al integrarse en TablaDocumentos (C1-09).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/acciones.ts" implementation-notes.md
git commit -m "C1-05: server actions actualizar/renombrar/eliminar documento"
```

---

## Tarea C1-06 — Componente `PanelSubidas` (cola en cliente)

**Files:**
- Create: `web/src/app/(app)/mis-documentos/PanelSubidas.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { DropZone } from "@/components/ui/DropZone";
import { PipelineRow, type EstadoArchivo } from "@/components/ui/PipelineRow";
import { useToast } from "@/components/ui/Toast";

const FORMATOS = [".pdf", ".docx", ".txt", ".xlsx", ".csv", ".pptx"];
const FORMATOS_OK = new Set(["pdf", "docx", "txt", "xlsx", "csv", "pptx"]);
const TAMANO_MAX = 10 * 1024 * 1024; // 10 MB
const MAX_POR_TANDA = 10;
const CONCURRENCIA = 3;
const TIEMPO_FADE_LISTO = 5000;

interface ArchivoEnCola {
  id: string;
  fichero: File;
  estado: EstadoArchivo;
  progreso: number;
  error?: string;
  saliendo?: boolean;
  /** Controller para abortar el fetch SSE si hace falta. */
  abort?: AbortController;
}

const ORDEN_ESTADO: Record<EstadoArchivo, number> = {
  texto: 1,
  analizando: 2,
  guardado: 3,
  subido: 0,
  listo: 4,
  en_cola: -1,
  error: -1,
};

/**
 * Panel que orquesta una cola de subidas multi-archivo con concurrencia 3.
 * Cada archivo abre su propia conexión SSE a /api/subir.
 */
export function PanelSubidas() {
  const router = useRouter();
  const { mostrar } = useToast();
  const [archivos, setArchivos] = useState<ArchivoEnCola[]>([]);
  /** IDs actualmente procesando (no en cola, no listos, no error). */
  const activos = useRef(new Set<string>());

  /** Despacha tantos archivos de la cola como permita la concurrencia. */
  const despachar = useCallback(() => {
    setArchivos((actual) => {
      let activosCount = activos.current.size;
      if (activosCount >= CONCURRENCIA) return actual;

      const proximos = actual
        .filter((a) => a.estado === "en_cola")
        .slice(0, CONCURRENCIA - activosCount);

      if (proximos.length === 0) return actual;

      for (const p of proximos) {
        activos.current.add(p.id);
        // Lanzar la subida fuera del setState (efecto secundario).
        queueMicrotask(() => subirArchivo(p.id, p.fichero));
        activosCount++;
      }

      return actual.map((a) =>
        proximos.some((p) => p.id === a.id)
          ? { ...a, estado: "subido", progreso: 0 }
          : a,
      );
    });
  }, []);

  /** Actualiza un archivo por ID. */
  const actualizar = useCallback(
    (id: string, cambios: Partial<ArchivoEnCola>) => {
      setArchivos((actual) =>
        actual.map((a) => (a.id === id ? { ...a, ...cambios } : a)),
      );
    },
    [],
  );

  /** Sube un archivo (abre SSE, parsea eventos, actualiza estado). */
  const subirArchivo = useCallback(
    async (id: string, fichero: File) => {
      const abort = new AbortController();
      actualizar(id, { abort });

      const body = new FormData();
      body.append("archivo", fichero);

      let resp: Response;
      try {
        resp = await fetch("/api/subir", {
          method: "POST",
          body,
          signal: abort.signal,
        });
      } catch {
        activos.current.delete(id);
        actualizar(id, {
          estado: "error",
          error: "No se pudo conectar con el servidor.",
          abort: undefined,
        });
        despachar();
        return;
      }

      if (!resp.body) {
        activos.current.delete(id);
        actualizar(id, {
          estado: "error",
          error: "Respuesta inesperada del servidor.",
          abort: undefined,
        });
        despachar();
        return;
      }

      const reader = resp.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const bloques = buffer.split("\n\n");
          buffer = bloques.pop() ?? "";

          for (const bloque of bloques) {
            const linea = bloque.trim();
            if (!linea.startsWith("data:")) continue;
            let evento: Record<string, unknown>;
            try {
              evento = JSON.parse(linea.slice(5).trim());
            } catch {
              continue;
            }
            const fase = String(evento.fase ?? "");
            procesarEvento(id, fase, evento);
          }
        }
      } catch {
        actualizar(id, {
          estado: "error",
          error: "Error al procesar la respuesta del servidor.",
          abort: undefined,
        });
        activos.current.delete(id);
        despachar();
      }
    },
    [actualizar, despachar],
  );

  /** Mapea un evento SSE del server al estado del cliente. */
  const procesarEvento = useCallback(
    (id: string, fase: string, evento: Record<string, unknown>) => {
      if (fase === "extrayendo") {
        actualizar(id, { estado: "texto", progreso: 33 });
      } else if (fase === "clasificando") {
        actualizar(id, { estado: "analizando", progreso: 66 });
      } else if (fase === "guardando") {
        actualizar(id, { estado: "guardado", progreso: 99 });
      } else if (fase === "completado") {
        actualizar(id, {
          estado: "listo",
          progreso: 100,
          abort: undefined,
        });
        activos.current.delete(id);
        router.refresh();
        despachar();
        // Fade-out a los 5 s.
        setTimeout(() => {
          actualizar(id, { saliendo: true });
          setTimeout(() => {
            setArchivos((actual) => actual.filter((a) => a.id !== id));
          }, 500);
        }, TIEMPO_FADE_LISTO);
      } else if (fase === "error") {
        actualizar(id, {
          estado: "error",
          error: String(evento.error ?? "Error al subir el archivo."),
          abort: undefined,
        });
        activos.current.delete(id);
        despachar();
      }
    },
    [actualizar, despachar, router],
  );

  /** Acepta un drop o picker. Valida formato + tamaño + límite, encola. */
  const aceptarArchivos = (lista: File[]) => {
    const aceptados: ArchivoEnCola[] = [];
    let descartadosFormato = 0;
    let descartadosTamano = 0;
    let descartadosLimite = 0;

    for (const f of lista) {
      if (aceptados.length >= MAX_POR_TANDA) {
        descartadosLimite++;
        continue;
      }
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!FORMATOS_OK.has(ext)) {
        descartadosFormato++;
        continue;
      }
      if (f.size > TAMANO_MAX) {
        descartadosTamano++;
        continue;
      }
      aceptados.push({
        id: crypto.randomUUID(),
        fichero: f,
        estado: "en_cola",
        progreso: 0,
      });
    }

    if (descartadosFormato > 0) {
      mostrar({
        variant: "err",
        titulo: `${descartadosFormato} archivo${descartadosFormato === 1 ? "" : "s"} con formato no soportado.`,
        detalle: "Solo PDF, DOCX, TXT, XLSX, CSV o PPTX.",
      });
    }
    if (descartadosTamano > 0) {
      mostrar({
        variant: "err",
        titulo: `${descartadosTamano} archivo${descartadosTamano === 1 ? "" : "s"} más grande${descartadosTamano === 1 ? "" : "s"} que 10 MB.`,
      });
    }
    if (descartadosLimite > 0) {
      mostrar({
        variant: "warn",
        titulo: `Solo los primeros ${MAX_POR_TANDA} archivos se procesarán.`,
        detalle: `${descartadosLimite} descartado${descartadosLimite === 1 ? "" : "s"}.`,
      });
    }

    if (aceptados.length === 0) return;

    setArchivos((actual) => [...actual, ...aceptados]);
    // Despachar tras el setState (en el siguiente tick).
    queueMicrotask(despachar);
  };

  const cancelar = (id: string) =>
    setArchivos((actual) => actual.filter((a) => a.id !== id));

  const quitar = (id: string) =>
    setArchivos((actual) => actual.filter((a) => a.id !== id));

  const reintentar = (id: string) => {
    actualizar(id, {
      estado: "en_cola",
      progreso: 0,
      error: undefined,
    });
    queueMicrotask(despachar);
  };

  const enCurso = archivos.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <DropZone
        onArchivos={aceptarArchivos}
        accept={FORMATOS.join(",")}
        multiple
      >
        <div className="grid place-items-center w-12 h-12 mx-auto rounded-[14px] bg-accent-tint text-accent font-display italic font-semibold text-[22px] mb-3">
          ↓
        </div>
        <div className="font-display text-lg font-medium tracking-[-0.01em]">
          Arrastra archivos <em className="italic text-accent">aquí</em>
        </div>
        <div className="text-mute text-[13px]">
          o haz click para seleccionarlos. Puedes subir varios a la vez.
        </div>
        <div className="font-mono text-[10px] text-mute uppercase tracking-[0.08em] mt-3.5">
          PDF · DOCX · TXT · XLSX · CSV · PPTX · hasta 10 MB · máx {MAX_POR_TANDA} a la vez
        </div>
      </DropZone>

      {enCurso && (
        <div className="rounded-[14px] border border-rule bg-paper p-5">
          <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0">
            Subidas <em className="italic text-accent">en curso</em>
          </h3>
          <div className="text-[12px] text-mute font-display italic mt-1 mb-3.5">
            {archivos.length} archivo{archivos.length === 1 ? "" : "s"} en este momento
          </div>
          <div className="flex flex-col">
            {archivos.map((a) => (
              <PipelineRow
                key={a.id}
                tipo={a.fichero.name.split(".").pop() ?? ""}
                nombre={a.fichero.name}
                estado={a.estado}
                progreso={a.progreso}
                error={a.error}
                saliendo={a.saliendo}
                onCancelar={a.estado === "en_cola" ? () => cancelar(a.id) : undefined}
                onReintentar={a.estado === "error" ? () => reintentar(a.id) : undefined}
                onQuitar={a.estado === "error" ? () => quitar(a.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-06: Panel de subidas con cola en cliente

**Pedido**
- Cola en cliente con concurrencia 3, límite 10 por tanda, multi-upload paralelo, SSE existente sin tocar.
- Validación formato + tamaño + límite con toasts de feedback.
- Pipeline visible por archivo con fade-out a 5s tras completar.
- Cancelar pendientes, reintentar errores, quitar.

**Decidido por Claude**
- Mantengo el ref activos como Set<id> para llevar el conteo concurrente sin meter más estado React (evita race conditions en useState).
- Uso queueMicrotask para despachar tras setState, no useEffect [archivos], porque el efecto se dispararía con el cambio de estado de archivos durante la subida (cada evento SSE) y crearía bucles.
- El refresh de /mis-documentos se hace con router.refresh() al recibir "completado", no al final de la tanda — así el usuario ve el documento aparecer en la lista mientras siguen subidas activas.
- Fade-out CSS via prop `saliendo` que cambia opacity y luego un setTimeout limpia el item del estado tras 500ms.

**Cambios** — Ninguno respecto a la spec.

**Compromisos**
- El AbortController guardado en cada archivo nunca se llama (no hay flujo de "cancelar mientras procesa"). Si lo necesitamos en el futuro (botón cancelar para archivos ya subidos), está la infra puesta.
- Si el navegador cierra la pestaña, las subidas se cortan — no hay persistencia de la cola.

**A revisar** — Verificación al integrarse en /mis-documentos (C1-10) con varias subidas reales en paralelo.

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/PanelSubidas.tsx" implementation-notes.md
git commit -m "C1-06: PanelSubidas con cola en cliente y concurrencia 3"
```

---

## Tarea C1-07 — Componente `RenombrarInline`

**Files:**
- Create: `web/src/app/(app)/mis-documentos/RenombrarInline.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

import { renombrarDocumento } from "./acciones";
import { useToast } from "@/components/ui/Toast";

interface Props {
  docId: number;
  nombre: string;
}

/** Nombre clickable. Al hacer click se vuelve input editable con ✓/✕. */
export function RenombrarInline({ docId, nombre: nombreInicial }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nombreInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrar } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editando]);

  const guardar = async () => {
    if (valor.trim() === nombreInicial.trim()) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    const fd = new FormData();
    fd.append("doc_id", String(docId));
    fd.append("nombre", valor);
    const res = await renombrarDocumento(undefined, fd);
    setGuardando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      setEditando(false);
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
      setValor(nombreInicial); // restaurar
    }
  };

  const cancelar = () => {
    setValor(nombreInicial);
    setEditando(false);
  };

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-left font-medium truncate hover:text-accent transition-colors w-full"
        title="Click para renombrar"
      >
        {nombreInicial}
      </button>
    );
  }

  return (
    <div className="flex gap-1 items-center">
      <input
        ref={inputRef}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void guardar();
          if (e.key === "Escape") cancelar();
        }}
        maxLength={200}
        disabled={guardando}
        className="flex-1 min-w-0 rounded-[6px] border border-accent bg-card px-2 py-1 text-sm focus:outline-none focus:ring-3 focus:ring-accent-tint"
      />
      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="text-accent hover:text-accent-hover text-sm font-mono px-1.5"
        aria-label="Guardar"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={cancelar}
        disabled={guardando}
        className="text-mute hover:text-ink text-sm font-mono px-1.5"
        aria-label="Cancelar"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-07: RenombrarInline

**Pedido**
- Edición inline del nombre del documento desde la tabla: click → input con ✓/✕.
- Enter guarda, Escape cancela. Si el valor no cambió, no llama al server.

**Decidido por Claude** — Ninguna.
**Cambios** — Ninguno.
**Compromisos** —
  - Si el server devuelve error, restauramos el valor original y mostramos toast.
  - El input usa autofocus + select-all al entrar en modo edición — comportamiento esperado.
**A revisar** — Probar UX al integrarse en tabla (C1-09).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/RenombrarInline.tsx" implementation-notes.md
git commit -m "C1-07: RenombrarInline para edicion del nombre"
```

---

## Tarea C1-08 — Modales `ModalHacerPublico` y `ModalEliminar`

**Files:**
- Create: `web/src/app/(app)/mis-documentos/ModalHacerPublico.tsx`
- Create: `web/src/app/(app)/mis-documentos/ModalEliminar.tsx`

**Steps:**

- [ ] **Paso 1: Crear `ModalHacerPublico.tsx`**

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

import { actualizarConfidencialidad } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: number;
  nombre: string;
  tipo: string;
}

export function ModalHacerPublico({
  abierto,
  onClose,
  docId,
  nombre,
  tipo,
}: Props) {
  const { mostrar } = useToast();
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", String(docId));
    fd.append("nueva", "0");
    const res = await actualizarConfidencialidad(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      cerrar();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const cerrar = () => {
    setConfirmado(false);
    onClose();
  };

  return (
    <Modal
      abierto={abierto}
      onClose={cerrar}
      titulo="¿Hacer este documento público?"
      tono="warn"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!confirmado || enviando}
            loading={enviando}
            onClick={confirmar}
          >
            Sí, hacerlo público
          </Button>
        </>
      }
    >
      <p className="text-mute text-[13px] leading-[1.55] m-0 mb-4">
        Cualquiera con cuenta podrá verlo y descargarlo desde "Explorar". Esta
        acción se puede revertir, pero los accesos quedan registrados.
      </p>

      <div className="flex items-center gap-3 p-[10px_14px] border border-rule rounded-[10px] bg-paper mb-3.5">
        <span className="w-7 h-8 rounded-[5px] bg-card border border-rule grid place-items-center font-display italic text-accent text-[13px]">
          {tipo.slice(0, 3).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-[13px] truncate">{nombre}</div>
          <div className="text-mute text-[11px] font-mono">clasificado como privado</div>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer select-none">
        <span
          onClick={() => setConfirmado((v) => !v)}
          className={[
            "w-[18px] h-[18px] rounded-[5px] border-[1.5px] grid place-items-center transition-all",
            confirmado
              ? "bg-accent border-accent"
              : "bg-card border-rule",
          ].join(" ")}
        >
          {confirmado && (
            <span className="text-white text-[11px] font-semibold">✓</span>
          )}
        </span>
        He revisado el documento y confirmo que no contiene datos personales ni
        información confidencial.
      </label>
    </Modal>
  );
}
```

- [ ] **Paso 2: Crear `ModalEliminar.tsx`**

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

import { eliminarDocumento } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: number;
  nombre: string;
}

export function ModalEliminar({ abierto, onClose, docId, nombre }: Props) {
  const { mostrar } = useToast();
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", String(docId));
    const res = await eliminarDocumento(undefined, fd);
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
      titulo="¿Eliminar este documento?"
      tono="danger"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={enviando}
            onClick={confirmar}
          >
            Sí, eliminar
          </Button>
        </>
      }
    >
      <p className="text-mute text-[13px] leading-[1.55] m-0">
        Se eliminará <span className="font-medium text-ink">{nombre}</span> de
        tu archivo. Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
}
```

- [ ] **Paso 3: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 4: Bitácora y commit**

```
---

## 2026-05-27 — C1-08: Modales hacer público y eliminar

**Pedido**
- Modal "¿Hacer público?" tono warn, checkbox obligatorio para habilitar el botón accent.
- Modal "¿Eliminar?" tono danger, botón rojo, sin checkbox (un click confirma).

**Decidido por Claude**
- Modal eliminar sin checkbox de doble confirmación — el botón rojo y el mensaje "no se puede deshacer" son suficientes para una acción tan común. Si en el futuro queremos paranoia extra, añadir `requiresTyping` (escribir el nombre).
- ModalHacerPublico recibe `tipo` para mostrar el icono — duplica un poco la lógica del icono pero mantiene el modal autónomo.

**Cambios** — Ninguno.
**Compromisos** — Ninguno.
**A revisar** — Verificación al integrarse en TablaDocumentos (C1-09).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/ModalHacerPublico.tsx" "web/src/app/(app)/mis-documentos/ModalEliminar.tsx" implementation-notes.md
git commit -m "C1-08: modales ModalHacerPublico y ModalEliminar"
```

---

## Tarea C1-09 — Componente `TablaDocumentos`

**Files:**
- Create: `web/src/app/(app)/mis-documentos/TablaDocumentos.tsx`

**Steps:**

- [ ] **Paso 1: Crear el fichero**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";

import { actualizarConfidencialidad } from "./acciones";
import { ModalHacerPublico } from "./ModalHacerPublico";
import { ModalEliminar } from "./ModalEliminar";
import { RenombrarInline } from "./RenombrarInline";

export interface DocumentoFila {
  id: number;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
}

interface Props {
  documentos: DocumentoFila[];
}

type Filtro = "todos" | "privados" | "publicos";

const ETIQUETAS_FILTRO: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "privados", label: "Privados" },
  { id: "publicos", label: "Públicos" },
];

export function TablaDocumentos({ documentos }: Props) {
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalPublico, setModalPublico] = useState<DocumentoFila | null>(null);
  const [modalBorrar, setModalBorrar] = useState<DocumentoFila | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);

  const filtrados = documentos.filter((d) => {
    if (filtro === "privados") return (d.confidencialidad ?? 1) === 1;
    if (filtro === "publicos") return (d.confidencialidad ?? 1) === 0;
    return true;
  });

  const cambiarAPrivado = async (doc: DocumentoFila) => {
    const fd = new FormData();
    fd.append("doc_id", String(doc.id));
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    if (res && "ok" in res) mostrar({ variant: "ok", titulo: res.ok });
    else if (res && "error" in res)
      mostrar({ variant: "err", titulo: res.error });
  };

  return (
    <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
      {/* Cabecera con filtros */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-rule">
        <h3 className="font-display font-medium text-lg tracking-[-0.01em] m-0">
          Todos los <em className="italic text-accent">documentos</em>
        </h3>
        <div className="inline-flex bg-soft rounded-full p-[3px] gap-[2px]">
          {ETIQUETAS_FILTRO.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={[
                "px-3 py-[5px] rounded-full text-xs font-medium transition-colors",
                filtro === f.id
                  ? "bg-card text-ink"
                  : "text-mute hover:text-ink",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cabecera tabla */}
      <div className="grid grid-cols-[44px_1fr_120px_100px_120px_30px] items-center px-5 py-2.5 gap-3.5 bg-soft text-mute font-display italic text-xs border-b border-rule">
        <div></div>
        <div>Documento</div>
        <div>Estado</div>
        <div>Tamaño</div>
        <div>Modificado</div>
        <div></div>
      </div>

      {/* Filas */}
      {filtrados.length === 0 ? (
        <div className="px-5 py-10 text-center text-mute text-sm">
          No hay documentos en este filtro.
        </div>
      ) : (
        filtrados.map((doc) => {
          const tipo = (doc.tipo_archivo ?? "").toUpperCase();
          const esPublico = (doc.confidencialidad ?? 1) === 0;
          const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
          const kb = doc.tamano_bytes
            ? Math.round(doc.tamano_bytes / 1024)
            : null;

          return (
            <div
              key={doc.id}
              className="grid grid-cols-[44px_1fr_120px_100px_120px_30px] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
            >
              <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent">
                {tipo.slice(0, 3) || "?"}
              </span>
              <div className="min-w-0">
                <RenombrarInline docId={doc.id} nombre={doc.nombre} />
                <div className="text-mute text-[11px] font-mono mt-0.5">
                  /personal · {tipo.toLowerCase() || "—"}
                </div>
              </div>
              <div>
                {esPublico ? (
                  <button
                    type="button"
                    onClick={() => void cambiarAPrivado(doc)}
                    title="Click para hacer privado"
                  >
                    <Tag variant="pub">público</Tag>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalPublico(doc)}
                    title="Click para hacer público"
                  >
                    <Tag variant="priv">privado</Tag>
                  </button>
                )}
              </div>
              <div className="text-mute font-mono text-[12px]">
                {kb !== null ? `${kb} KB` : "—"}
              </div>
              <div className="text-mute font-mono text-[12px]">{fecha}</div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setMenuAbierto(menuAbierto === doc.id ? null : doc.id)
                  }
                  className="text-mute hover:text-ink px-1.5 py-1 rounded-[6px] hover:bg-soft"
                  aria-label="Más acciones"
                >
                  ⋯
                </button>
                {menuAbierto === doc.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuAbierto(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-rule rounded-[10px] shadow-[var(--shadow-2)] py-1 min-w-[160px]">
                      <Link
                        href={`/documentos/${doc.id}`}
                        className="block px-3 py-1.5 text-[13px] hover:bg-soft"
                        onClick={() => setMenuAbierto(null)}
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setModalBorrar(doc);
                          setMenuAbierto(null);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-[13px] text-danger hover:bg-danger-tint"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Modales */}
      {modalPublico && (
        <ModalHacerPublico
          abierto={modalPublico !== null}
          onClose={() => setModalPublico(null)}
          docId={modalPublico.id}
          nombre={modalPublico.nombre}
          tipo={modalPublico.tipo_archivo ?? ""}
        />
      )}
      {modalBorrar && (
        <ModalEliminar
          abierto={modalBorrar !== null}
          onClose={() => setModalBorrar(null)}
          docId={modalBorrar.id}
          nombre={modalBorrar.nombre}
        />
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-09: TablaDocumentos

**Pedido**
- Tabla filtrable con pills (Todos/Privados/Públicos), fila con icono + RenombrarInline + tag clickable + menú ⋯ (ver detalle + eliminar).
- Tag click: priv→pub abre ModalHacerPublico, pub→priv directo.

**Decidido por Claude**
- El filtro "Procesando" mencionado en la spec se omite porque los documentos en proceso no aparecen aún en la lista (están en PanelSubidas). Si en C.2 metemos un estado "procesando" persistente, lo añadimos.
- Menú ⋯ con click-outside via div fixed inset-0 invisible (truco simple sin librería).
- La ruta breadcrumb "/personal · pdf" es decorativa de momento — cuando haya carpetas (C.3) mostraremos la ruta real.

**Cambios**
- Sin filtro "Procesando" (ver arriba).

**Compromisos** — Ninguno.

**A revisar** — Probar UX completa al integrarse en /mis-documentos (C1-10) con varios documentos en distintos estados.

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/TablaDocumentos.tsx" implementation-notes.md
git commit -m "C1-09: TablaDocumentos con filtros, tag clickable y menu de acciones"
```

---

## Tarea C1-10 — Pantalla `/mis-documentos` rediseñada

**Files:**
- Modify: `web/src/app/(app)/mis-documentos/page.tsx`
- Delete: `web/src/components/SubidaArchivos.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(app)/mis-documentos/page.tsx`**

```tsx
import { redirect } from "next/navigation";

import { Kpi } from "@/components/ui/Kpi";
import { KpiAnillo } from "@/components/ui/KpiAnillo";
import { Button } from "@/components/ui/Button";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { PanelSubidas } from "./PanelSubidas";
import { TablaDocumentos, type DocumentoFila } from "./TablaDocumentos";

const ESPACIO_TOTAL_MB = 500;
const HOY_INICIO_MS = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

export default async function PaginaMisDocumentos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })
    .limit(100);

  const documentos: DocumentoFila[] = data ?? [];
  const total = documentos.length;
  const privados = documentos.filter((d) => (d.confidencialidad ?? 1) === 1).length;
  const publicos = total - privados;
  const espacioBytes = documentos.reduce(
    (acc, d) => acc + (d.tamano_bytes ?? 0),
    0,
  );
  const espacioMB = espacioBytes / (1024 * 1024);
  const espacioPct = (espacioMB / ESPACIO_TOTAL_MB) * 100;
  const hoyN = documentos.filter(
    (d) => new Date(d.fecha).getTime() >= HOY_INICIO_MS,
  ).length;
  const ultima = documentos[0]
    ? new Date(documentos[0].fecha)
    : null;
  const ultimaTexto = ultima ? formatoTiempoRelativo(ultima) : null;

  return (
    <div className="max-w-6xl mx-auto p-8 flex flex-col gap-7">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-display italic text-accent text-sm m-0">
            — tu archivo personal
          </p>
          <h1 className="font-display font-medium text-4xl tracking-[-0.02em] m-0 mt-1">
            Mis <em className="italic text-accent">documentos</em>
          </h1>
          <p className="text-mute text-sm font-display italic mt-2">
            {total} documento{total === 1 ? "" : "s"} ·{" "}
            {espacioMB.toFixed(1)} MB
            {ultimaTexto ? ` · última subida ${ultimaTexto}` : ""}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Kpi
          label="Documentos"
          valor={total}
          pista="en tu archivo"
          delta={hoyN > 0 ? `+${hoyN} hoy` : undefined}
        />
        <Kpi
          label="Privados"
          valor={
            <>
              <em className="italic text-accent font-medium">{privados}</em>
            </>
          }
          pista={total > 0 ? `${Math.round((privados / total) * 100)}% del total` : "—"}
          visual={
            total > 0 ? <KpiAnillo porcentaje={(privados / total) * 100} /> : undefined
          }
        />
        <Kpi
          label="Públicos"
          valor={
            <>
              <em className="italic text-accent font-medium">{publicos}</em>
            </>
          }
          pista={total > 0 ? `${Math.round((publicos / total) * 100)}% del total` : "—"}
          visual={
            total > 0 ? <KpiAnillo porcentaje={(publicos / total) * 100} /> : undefined
          }
        />
        <Kpi
          label="Espacio"
          valor={
            <>
              {espacioMB.toFixed(1)}
              <span className="text-[16px] text-mute font-display italic"> MB</span>
            </>
          }
          pista={`de ${ESPACIO_TOTAL_MB} MB`}
          delta={`${espacioPct.toFixed(1)}%`}
        />
      </div>

      <PanelSubidas />

      {documentos.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-rule bg-paper p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-[16px] bg-accent-tint text-accent grid place-items-center font-display italic font-semibold text-[26px] mb-4">
            ∅
          </div>
          <h4 className="font-display font-medium text-[22px] tracking-[-0.01em] m-0 mb-1.5">
            Aún no hay <em className="italic text-accent">documentos</em>
          </h4>
          <p className="text-mute text-[13px] max-w-sm mx-auto mb-[18px] leading-[1.55]">
            Sube tu primer archivo arrastrándolo al área de arriba. La plataforma
            lo clasificará automáticamente en pocos segundos.
          </p>
        </div>
      ) : (
        <TablaDocumentos documentos={documentos} />
      )}
    </div>
  );
}

function formatoTiempoRelativo(d: Date): string {
  const ahora = Date.now();
  const diff = ahora - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `hace ${dias} días`;
  return d.toLocaleDateString("es-ES");
}
```

- [ ] **Paso 2: Eliminar `web/src/components/SubidaArchivos.tsx`** (ya no se usa)

```bash
rm web/src/components/SubidaArchivos.tsx
```

- [ ] **Paso 3: Verificar tipos y build**

```bash
cd web && npx tsc --noEmit
```

Si encuentras un error sobre `SubidaArchivos` siendo importado en otro sitio, búscalo con `grep -r "SubidaArchivos" web/src/` y elimina la importación huérfana.

- [ ] **Paso 4: Bitácora y commit**

```
---

## 2026-05-27 — C1-10: Pantalla /mis-documentos rediseñada

**Pedido**
- Server Component que carga documentos del usuario, calcula KPIs, monta el panel de subidas, la tabla y el estado vacío.
- Aplicar todo el sistema Esmeralda biblioteca.

**Decidido por Claude**
- Límite de 100 documentos en el SELECT (sin paginación todavía). En C.5 (descarga masiva) o cuando aparezca el caso, añadimos paginación.
- Eliminado SubidaArchivos.tsx (reemplazado por PanelSubidas).
- Espacio total fijado en 500 MB como mock — no es un dato real del usuario, solo decorativo. Cuando exista el sistema de cuotas, se calcula real.
- Tiempo relativo en español a mano (sin librería como date-fns).

**Cambios**
- "Última subida hace 2 h" usa una utilidad local de tiempo relativo (no date-fns).
- Sin paginación (ver compromisos).

**Compromisos**
- 100 documentos límite — para el TFG basta; en producción real habría paginación.
- Espacio total 500 MB es un placeholder.

**A revisar**
- Probar con 0, 1, varios, y >100 documentos.
- Verificar visualmente que los KPIs cuadran (público + privado = total).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/mis-documentos/page.tsx" implementation-notes.md
git rm web/src/components/SubidaArchivos.tsx 2>/dev/null || true
git commit -m "C1-10: pantalla /mis-documentos rediseniada con KPIs, panel subidas y tabla"
```

---

## Tarea C1-11 — Pantalla `/inicio` rediseñada

**Files:**
- Modify: `web/src/app/(app)/inicio/page.tsx`

**Steps:**

- [ ] **Paso 1: Reemplazar el contenido entero de `web/src/app/(app)/inicio/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_completo, nombre_usuario")
    .eq("id", user.id)
    .single();

  const { count: totalDocs } = await admin
    .from("Documentos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const saludo = perfil?.nombre_completo
    ? perfil.nombre_completo.split(/\s+/)[0]
    : perfil?.nombre_usuario ?? "";

  return (
    <div className="max-w-5xl mx-auto p-8 flex flex-col gap-10">
      <header>
        <p className="font-display italic text-accent text-sm m-0">
          — bienvenido a tu archivo
        </p>
        <h1 className="font-display font-medium text-5xl tracking-[-0.02em] m-0 mt-1">
          Hola, <em className="italic text-accent">{saludo}</em>.
        </h1>
        <p className="text-mute text-base font-display italic mt-3">
          {totalDocs ?? 0} documento{totalDocs === 1 ? "" : "s"} en tu archivo.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AtajoCard
          href="/mis-documentos"
          eyebrow="empieza"
          titulo="Subir un documento"
          descripcion="Arrastra un archivo y déjalo en manos del modelo."
        />
        <AtajoCard
          href="/mis-documentos"
          eyebrow="organiza"
          titulo="Ver mis documentos"
          descripcion="Tu archivo personal — clasifica, renombra, elimina."
        />
        <AtajoCard
          href="/explorar"
          eyebrow="descubre"
          titulo="Explorar la comunidad"
          descripcion="Documentos públicos compartidos por otros usuarios."
        />
      </div>
    </div>
  );
}

function AtajoCard({
  href,
  eyebrow,
  titulo,
  descripcion,
}: {
  href: string;
  eyebrow: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[18px] border border-rule bg-card p-6 hover:border-accent-soft-hover transition-colors"
    >
      <p className="font-display italic text-accent text-xs m-0">— {eyebrow}</p>
      <h2 className="font-display font-medium text-[22px] tracking-[-0.01em] m-0">
        {titulo}
      </h2>
      <p className="text-mute text-[13px] leading-[1.55] m-0">{descripcion}</p>
      <span className="text-accent text-sm font-medium mt-auto">→</span>
    </Link>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Paso 3: Bitácora y commit**

```
---

## 2026-05-27 — C1-11: Pantalla /inicio rediseñada

**Pedido**
- Dashboard ligero post-login con saludo personalizado y 3 atajos (subir, mis docs, explorar).

**Decidido por Claude**
- El saludo usa el primer token del nombre_completo si existe, si no nombre_usuario. Tono cercano.
- 3 atajos como cards iguales — sin el panel "Actividad reciente" mencionado en la spec (lo dejamos para C.2/C.3 cuando haya eventos reales que mostrar).

**Cambios** — Omitido el panel "Actividad reciente" hasta C.2/C.3.
**Compromisos** — Ninguno.
**A revisar** — Confirmar que el saludo se ve bien con usuarios sin nombre_completo (cae a nombre_usuario).

Verificación: npx tsc --noEmit → 0 errores.
```

```bash
git add "web/src/app/(app)/inicio/page.tsx" implementation-notes.md
git commit -m "C1-11: pantalla /inicio rediseniada como dashboard ligero"
```

---

## Tarea C1-12 — Build + smoke test + cierre del sub-bloque C.1

**Files:** Ninguno (puede haber commit de bitácora).

**Steps:**

- [ ] **Paso 1: Build de producción**

```bash
cd web && npm run build
```

Esperado: build limpio con todas las rutas. Captura el número de rutas.

- [ ] **Paso 2: Tests verdes**

```bash
cd web && npm test
```

Esperado: 13/13 (de B-04). Esta tarea no añade tests nuevos.

- [ ] **Paso 3: Documentar el smoke test manual para el usuario**

Añade al final de `implementation-notes.md`:

```
---

## 2026-05-27 — C1-12: Cierre del sub-bloque C.1

**Pedido**
- Verificación final del bloque (build limpio, tests verdes), documentación del smoke test manual.

**Decidido por Claude** — Ninguna. Tarea de verificación.

**Cambios**
- Eliminado SubidaArchivos.tsx (legacy, reemplazado por PanelSubidas con cola multi-upload).

**Compromisos**
- La verificación end-to-end de subida en paralelo requiere el servicio IA funcionando. Si no está SERVICIO_IA_URL en env, todos los documentos se clasifican como confidencial (fail-safe que ya estaba); el pipeline sigue visible.

**A revisar (acciones del usuario)**

Smoke test manual de C.1 (npm run dev, http://localhost:3001/mis-documentos):

1. **Multi-upload**
   - [ ] Arrastra 5 archivos válidos a la vez al panel de subida.
   - [ ] Confirma que se ven 5 filas en "Subidas en curso" — las 3 primeras en "subido/texto/analizando", las 2 últimas en "en_cola" con botón ✕ "cancelar".
   - [ ] Conforme cada uno termina, el siguiente de la cola se activa.
   - [ ] Al completar, la fila se queda con ✓ "listo" 5 s y desaparece (fade-out).
   - [ ] La tabla de documentos se actualiza con los nuevos archivos en tiempo real.

2. **Validaciones**
   - [ ] Arrastra 15 archivos válidos — solo se aceptan 10, toast warn con el descarte.
   - [ ] Arrastra un .mp3 — toast err "formato no soportado".
   - [ ] Arrastra un archivo > 10 MB — toast err "más grande que 10 MB".

3. **Cancelar y reintentar**
   - [ ] Sube varios archivos, mientras estén en "en_cola" pulsa ✕ — desaparecen sin procesarse.
   - [ ] (Si tienes el servicio IA apagado para forzar error) verifica que aparece la fila roja con "reintentar" y "quitar". Reintentar reactiva el proceso.

4. **Tabla y filtros**
   - [ ] Pulsa filtros "Privados" / "Públicos" / "Todos" — la lista filtra correctamente.
   - [ ] Click en pill "privado" de un documento → modal "¿Hacer público?".
   - [ ] Botón "Sí, hacerlo público" empieza deshabilitado.
   - [ ] Marca el checkbox → botón se habilita.
   - [ ] Confirma → toast ok, el tag pasa a "público".
   - [ ] Click en pill "público" → cambio directo a "privado" sin modal, toast ok.

5. **Renombrar inline**
   - [ ] Click en el nombre de un documento → input editable.
   - [ ] Enter guarda, Escape cancela. Vacío o > 200 chars muestra error.

6. **Eliminar**
   - [ ] Click en ⋯ → menú con "Ver detalle" y "Eliminar".
   - [ ] Eliminar → modal danger.
   - [ ] Confirmar → toast ok, el documento desaparece de la lista.

7. **KPIs**
   - [ ] Tras hacer cambios (subir, eliminar, reclasificar), confirma que los 4 KPIs cuadran: Documentos = Privados + Públicos, anillos de progreso muestran %, "+N hoy" si hay alguno de hoy.

8. **/inicio**
   - [ ] Recarga la página principal. Saludo con tu nombre (primer token del completo, o username).
   - [ ] 3 atajos navegan correctamente.

9. **Dark mode**
   - [ ] DevTools → Rendering → Emulate prefers-color-scheme: dark → todo se ve coherente, los chips de pipeline tienen contraste, los toasts también.

**Resumen del sub-bloque C.1**

11 commits implementados (C1-01 a C1-11):

- C1-01 a C1-04: 4 componentes UI nuevos (Kpi, KpiAnillo, StageChip, DropZone, PipelineRow).
- C1-05: 3 server actions de documentos.
- C1-06: PanelSubidas con cola en cliente, concurrencia 3 y SSE.
- C1-07: RenombrarInline para edición rápida del nombre.
- C1-08: 2 modales (hacer público + eliminar).
- C1-09: TablaDocumentos con filtros, tags clickables y menú de acciones.
- C1-10: /mis-documentos rediseñada completa.
- C1-11: /inicio rediseñada.

Spec de C.1 cerrada al 100%.

Verificación final: npm test → 13/13. npm run build → éxito con [N] rutas.
```

Reemplaza `[N]` con el número real de rutas.

- [ ] **Paso 4: Commit final**

```bash
git add implementation-notes.md
git commit -m "C1-12: cierre sub-bloque C.1 (build limpio + tests verde + smoke test docs)"
```

Verify con `git log --oneline -15`.

## Self-review (cobertura de la spec)

| Requisito de la spec | Tarea(s) que lo cubre |
|---|---|
| Pantalla /mis-documentos rediseñada (KPIs + panel subidas + tabla) | C1-10 (orquestación), C1-01 (KPIs), C1-06 (subidas), C1-09 (tabla) |
| Pantalla /inicio rediseñada | C1-11 |
| Multi-upload con cola concurrencia 3, límite 10 | C1-06 |
| Pipeline visible por archivo, 4 stages | C1-04 (componente), C1-06 (lógica) |
| Fade-out a 5 s tras completar | C1-06 |
| Cancelar pendiente / reintentar / quitar | C1-04 (UI), C1-06 (lógica) |
| Validación formato + tamaño + límite | C1-06 |
| Reclasificar manual con modal de aviso | C1-05 (action), C1-08 (modal), C1-09 (integración) |
| CRUD: renombrar inline + eliminar con modal | C1-05 (actions), C1-07 (renombrar), C1-08 (modal), C1-09 (integración) |
| Aplicación del sistema Esmeralda | Toda la fase |
| Eliminar SubidaArchivos viejo | C1-10 |

Sin huecos detectados.
