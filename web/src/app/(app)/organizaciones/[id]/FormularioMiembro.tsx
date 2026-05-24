"use client";

import { useActionState } from "react";

import { agregarMiembro } from "../acciones";

export default function FormularioMiembro({ orgId }: { orgId: string }) {
  const accion = agregarMiembro.bind(null, orgId);
  const [estado, dispatch, pending] = useActionState<{ error: string } | undefined, FormData>(
    accion,
    undefined,
  );

  return (
    <form action={dispatch} className="flex flex-wrap gap-2">
      <input
        type="text"
        name="nombre_usuario"
        placeholder="Nombre de usuario…"
        required
        disabled={pending}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Añadiendo…" : "Añadir miembro"}
      </button>
      {estado?.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{estado.error}</p>
      )}
    </form>
  );
}
