"use client";

import { useEffect, useState } from "react";
import { Buscador } from "./Buscador";

export function BuscadorTrigger() {
  const [abierto, setAbierto] = useState(false);

  /* ⌘K / Ctrl+K */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full bg-card border border-rule rounded-full px-[14px] py-[7px] flex justify-between items-center text-mute text-[13px] mb-[18px] hover:bg-soft transition-colors cursor-pointer"
      >
        <span>Buscar todo…</span>
        <kbd className="font-mono text-[10px] bg-soft px-[6px] py-[1px] rounded border border-rule text-mute">
          ⌘K
        </kbd>
      </button>

      <Buscador abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
