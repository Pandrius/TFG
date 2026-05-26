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
