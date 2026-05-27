"use client";

import { useState, useRef, useEffect } from "react";

import { renombrarDocumento } from "./acciones";
import { useToast } from "@/components/ui/Toast";

interface Props {
  docId: string;
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
    fd.append("doc_id", docId);
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
