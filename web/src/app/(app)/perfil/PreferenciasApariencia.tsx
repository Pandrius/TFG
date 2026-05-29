"use client";

import { useState } from "react";

const CLAVE_TEMA = "dres_tema";

function temaInicial() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLAVE_TEMA) === "oscuro";
}

export function PreferenciasApariencia() {
  const [oscuro, setOscuro] = useState(temaInicial);

  const cambiarTema = (activo: boolean) => {
    setOscuro(activo);
    document.documentElement.classList.toggle("dark", activo);
    window.localStorage.setItem(CLAVE_TEMA, activo ? "oscuro" : "claro");
  };

  return (
    <section className="flex flex-col gap-5 rounded-[18px] border border-rule bg-card p-7">
      <div>
        <h2 className="font-display font-medium text-xl tracking-tight m-0">
          Apariencia
        </h2>
        <p className="text-mute text-[13px] mt-1">
          Ajusta el tema visual de la pagina.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-[12px] border border-rule bg-paper px-4 py-3 cursor-pointer">
        <span>
          <span className="block text-[14px] font-medium">Modo oscuro</span>
          <span className="block text-mute text-[12px] mt-0.5">
            Usa colores oscuros en toda la aplicacion.
          </span>
        </span>
        <input
          type="checkbox"
          checked={oscuro}
          onChange={(e) => cambiarTema(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-[var(--accent)]"
        />
      </label>
    </section>
  );
}
