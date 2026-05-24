"use client";

import { useActionState } from "react";

import { invitarUsuario } from "./acciones";
import type { ResultadoAccion } from "./acciones";

export default function FormularioInvitacion({ documentoId }: { documentoId: string }) {
  const accion = invitarUsuario.bind(null, documentoId);
  const [estado, dispatch, pending] = useActionState<ResultadoAccion | undefined, FormData>(
    accion,
    undefined,
  );

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Invitar usuario</h3>
      <div className="flex gap-2">
        <input
          type="text"
          name="nombre_usuario"
          placeholder="Nombre de usuario"
          required
          disabled={pending}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Invitando…" : "Invitar"}
        </button>
      </div>
      {estado && "error" in estado && (
        <p className="text-sm text-red-600 dark:text-red-400">{estado.error}</p>
      )}
      {estado && "ok" in estado && (
        <p className="text-sm text-green-600 dark:text-green-400">Permiso concedido.</p>
      )}
    </form>
  );
}
