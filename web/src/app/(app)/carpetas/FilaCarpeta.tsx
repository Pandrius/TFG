"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
    if (valor.trim() === carpeta.nombre) {
      setEditando(false);
      return;
    }
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
    const res = await eliminarCarpeta(carpeta.id);
    if (res && "error" in res) mostrar({ variant: "err", titulo: res.error });
  };

  return (
    <div className="grid grid-cols-[1fr_100px_80px_80px] items-center px-5 py-3 gap-3 border-b border-rule last:border-b-0 text-[13px]">
      {editando ? (
        <div className="flex gap-1 items-center">
          <input
            ref={inputRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void guardar();
              if (e.key === "Escape") { setValor(carpeta.nombre); setEditando(false); }
            }}
            maxLength={100}
            disabled={guardando}
            className="flex-1 min-w-0 rounded-[6px] border border-accent bg-card px-2 py-1 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="text-accent text-sm font-mono px-1.5"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => { setValor(carpeta.nombre); setEditando(false); }}
            className="text-mute text-sm font-mono px-1.5"
          >
            ✕
          </button>
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
      <span className="text-mute font-mono text-[12px]">
        {ndocs} doc{ndocs !== 1 ? "s" : ""}
      </span>
      <Link href={`/carpetas/${carpeta.id}`}>
        <Button variant="ghost" size="sm">Ver</Button>
      </Link>
      <button
        type="button"
        onClick={eliminar}
        className="text-danger hover:text-danger text-[12px] font-medium px-2 py-1 rounded-[6px] hover:bg-danger-tint transition-colors"
      >
        Eliminar
      </button>
    </div>
  );
}
