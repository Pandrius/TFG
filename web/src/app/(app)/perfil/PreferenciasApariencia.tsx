"use client";

import { useState } from "react";
import { useEffect } from "react";

const CLAVE_TEMA = "dres_tema";
const CLAVE_EXPLORAR = "dres_explorar_periodo";
const PERIODOS = [
  { valor: "dia", label: "Del dia" },
  { valor: "semana", label: "De la semana" },
  { valor: "mes", label: "Del mes" },
  { valor: "historia", label: "De la historia" },
] as const;
type Periodo = (typeof PERIODOS)[number]["valor"];

export function PreferenciasApariencia() {
  const [oscuro, setOscuro] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  useEffect(() => {
    queueMicrotask(() => {
      setOscuro(window.localStorage.getItem(CLAVE_TEMA) === "oscuro");
      const guardado = window.localStorage.getItem(CLAVE_EXPLORAR);
      if (esPeriodo(guardado)) setPeriodo(guardado);
    });
  }, []);

  const cambiarTema = (activo: boolean) => {
    setOscuro(activo);
    document.documentElement.classList.toggle("dark", activo);
    window.localStorage.setItem(CLAVE_TEMA, activo ? "oscuro" : "claro");
  };

  const cambiarPeriodo = (valor: Periodo) => {
    setPeriodo(valor);
    window.localStorage.setItem(CLAVE_EXPLORAR, valor);
    document.cookie = `dres_explorar_periodo=${valor}; path=/; max-age=31536000; samesite=lax`;
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

      <label className="flex items-center justify-between gap-4 rounded-[12px] border border-rule bg-paper px-4 py-3">
        <span>
          <span className="block text-[14px] font-medium">Explorar</span>
          <span className="block text-mute text-[12px] mt-0.5">
            Ordena la barra por archivos mas descargados.
          </span>
        </span>
        <select
          value={periodo}
          onChange={(e) => {
            const valor = e.target.value;
            if (esPeriodo(valor)) cambiarPeriodo(valor);
          }}
          className="rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
        >
          {PERIODOS.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function esPeriodo(valor: string | null): valor is Periodo {
  return valor === "dia" || valor === "semana" || valor === "mes" || valor === "historia";
}
