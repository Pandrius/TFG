"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

import { solicitarRecuperacion } from "../acciones";

export default function PaginaRecuperar() {
  const [estado, accion, pendiente] = useActionState(
    solicitarRecuperacion,
    undefined,
  );
  const error = estado && "error" in estado ? estado.error : undefined;
  const ok = estado && "ok" in estado ? estado.ok : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]">
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — restablecer contraseña
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            ¿Olvidaste tu <em className="italic text-accent">contraseña</em>?
          </h1>
          <p className="text-sm text-mute mt-3 leading-relaxed">
            Te enviamos un enlace por email para que crees una nueva.
          </p>
        </header>

        {ok ? (
          <Alert variant="ok" titulo="Revisa tu bandeja de entrada">
            {ok}
          </Alert>
        ) : (
          <form action={accion} className="flex flex-col gap-5">
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </FormField>

            {error && <Alert variant="err">{error}</Alert>}

            <Button type="submit" variant="accent" size="lg" loading={pendiente}>
              {pendiente ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="text-center text-sm text-mute hover:text-ink"
        >
          ← Volver al login
        </Link>
      </div>
    </main>
  );
}
