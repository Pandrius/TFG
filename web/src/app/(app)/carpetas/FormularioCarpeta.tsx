"use client";

import { useActionState } from "react";

import { crearCarpeta } from "./acciones";
import type { ResultadoCarpeta } from "./acciones";

export default function FormularioCarpeta() {
  const [estado, dispatch, pending] = useActionState<ResultadoCarpeta | undefined, FormData>(
    crearCarpeta,
    undefined,
  );

  return (
    <form action={dispatch} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        name="nombre"
        placeholder="Nombre de la nueva carpeta…"
        required
        disabled={pending}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear carpeta"}
      </button>
      {estado && "error" in estado && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{estado.error}</p>
      )}
    </form>
  );
}
