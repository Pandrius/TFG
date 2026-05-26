"use client";

import Link from "next/link";
import { useActionState } from "react";

import { iniciarSesion } from "../acciones";

export default function PaginaLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 p-8 dark:border-gray-800"
      >
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>

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
            autoComplete="current-password"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        {estado && "error" in estado && (
          <p className="text-sm text-red-600" role="alert">
            {estado.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente}
          className="rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pendiente ? "Entrando…" : "Entrar"}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-blue-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </main>
  );
}
