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
