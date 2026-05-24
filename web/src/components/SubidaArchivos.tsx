"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";

type Fase = "extrayendo" | "clasificando" | "guardando";

type Estado =
  | { tipo: "idle" }
  | { tipo: "progreso"; fase: Fase }
  | { tipo: "exito"; nombre: string; clasificacion: number }
  | { tipo: "error"; mensaje: string };

const PIPELINE: { id: Fase; label: string }[] = [
  { id: "extrayendo", label: "Extrayendo texto" },
  { id: "clasificando", label: "Clasificando documento" },
  { id: "guardando", label: "Guardando en el sistema" },
];

const ORDEN_FASE: Record<Fase, number> = {
  extrayendo: 0,
  clasificando: 1,
  guardando: 2,
};

export default function SubidaArchivos() {
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const [sobreZona, setSobreZona] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const procesando = estado.tipo === "progreso";

  async function subirArchivo(archivo: File) {
    setEstado({ tipo: "progreso", fase: "extrayendo" });

    const body = new FormData();
    body.append("archivo", archivo);

    let resp: Response;
    try {
      resp = await fetch("/api/subir", { method: "POST", body });
    } catch {
      setEstado({ tipo: "error", mensaje: "No se pudo conectar con el servidor." });
      return;
    }

    if (!resp.body) {
      setEstado({ tipo: "error", mensaje: "Respuesta inesperada del servidor." });
      return;
    }

    const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
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

          const fase = evento.fase as string;

          if (fase === "extrayendo" || fase === "clasificando" || fase === "guardando") {
            setEstado({ tipo: "progreso", fase });
          } else if (fase === "completado") {
            const doc = evento.doc as { nombre: string; confidencialidad: number };
            setEstado({ tipo: "exito", nombre: doc.nombre, clasificacion: doc.confidencialidad });
            router.refresh();
          } else if (fase === "error") {
            setEstado({ tipo: "error", mensaje: String(evento.error ?? "Error al subir el archivo") });
          }
        }
      }
    } catch {
      setEstado({ tipo: "error", mensaje: "Error al procesar la respuesta del servidor." });
    }
  }

  function manejarArchivos(lista: FileList | null) {
    if (!lista?.length || procesando) return;
    subirArchivo(lista[0]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setSobreZona(false);
    if (!procesando) manejarArchivos(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Zona de arrastre */}
      <div
        role="button"
        tabIndex={procesando ? -1 : 0}
        aria-disabled={procesando}
        onDragOver={(e) => { e.preventDefault(); if (!procesando) setSobreZona(true); }}
        onDragLeave={() => setSobreZona(false)}
        onDrop={onDrop}
        onClick={() => { if (!procesando) inputRef.current?.click(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !procesando) inputRef.current?.click(); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors select-none ${
          procesando
            ? "cursor-not-allowed border-gray-200 opacity-40 dark:border-gray-800"
            : sobreZona
            ? "cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "cursor-pointer border-gray-300 hover:border-gray-400 dark:border-gray-700"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Arrastra un archivo aquí o{" "}
          <span className="font-medium text-blue-600 dark:text-blue-400">selecciona uno</span>
        </p>
        <p className="text-xs text-gray-400">PDF, DOCX, TXT, XLSX, CSV, PPTX — máx. 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.xlsx,.csv,.pptx"
          className="hidden"
          onChange={(e) => manejarArchivos(e.target.files)}
        />
      </div>

      {/* Pipeline de procesamiento */}
      {estado.tipo === "progreso" && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Procesando documento
          </p>
          <ol className="flex flex-col">
            {PIPELINE.map((paso, i) => {
              const faseActual = ORDEN_FASE[estado.fase];
              const pasado = i < faseActual;
              const actual = i === faseActual;

              return (
                <li key={paso.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                        pasado
                          ? "bg-green-500 text-white"
                          : actual
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      {pasado ? (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : actual ? (
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                      )}
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div
                        className={`my-0.5 w-0.5 min-h-[1.25rem] flex-1 transition-colors duration-500 ${
                          pasado ? "bg-green-300 dark:bg-green-800" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`pb-4 pt-0.5 text-sm transition-colors duration-300 ${
                      pasado
                        ? "text-gray-400 dark:text-gray-500"
                        : actual
                        ? "font-medium text-blue-700 dark:text-blue-300"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {paso.label}
                    {actual && <span className="ml-1 animate-pulse text-gray-400">...</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Éxito */}
      {estado.tipo === "exito" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-green-900 dark:text-green-100">
                {estado.nombre}
              </p>
              <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                Clasificado como{" "}
                <span
                  className={`font-semibold ${
                    estado.clasificacion === 0
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {estado.clasificacion === 0 ? "Público" : "Confidencial"}
                </span>
              </p>
            </div>
            <button
              onClick={() => setEstado({ tipo: "idle" })}
              className="shrink-0 text-xs text-green-700 underline underline-offset-2 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
            >
              Subir otro
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {estado.tipo === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="flex-1 text-sm text-red-800 dark:text-red-200">{estado.mensaje}</p>
            <button
              onClick={() => setEstado({ tipo: "idle" })}
              className="shrink-0 text-xs text-red-700 underline underline-offset-2 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
