"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registrarse } from "../acciones";

export default function PaginaRegistro() {
  const [estado, accion, pendiente] = useActionState(registrarse, undefined);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 p-8 dark:border-gray-800"
      >
        <h1 className="text-2xl font-bold">Crear cuenta</h1>

        <label className="flex flex-col gap-1 text-sm">
          Nombre completo
          <input
            name="nombre_completo"
            type="text"
            autoComplete="name"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        {estado?.error && (
          <p className="text-sm text-red-600" role="alert">
            {estado.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente}
          className="rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pendiente ? "Creando…" : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
