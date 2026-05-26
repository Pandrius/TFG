"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

import { iniciarSesion } from "../acciones";

export default function PaginaLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);
  const error = estado && "error" in estado ? estado.error : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]"
      >
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — vuelve a tu archivo
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Iniciar sesión.
          </h1>
        </header>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </FormField>

        {error && <Alert variant="err">{error}</Alert>}

        <Button type="submit" variant="accent" size="lg" loading={pendiente}>
          {pendiente ? "Entrando…" : "Entrar"}
        </Button>

        <div className="flex justify-between text-sm">
          <Link
            href="/recuperar"
            className="text-mute hover:text-ink"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <Link
            href="/registro"
            className="text-accent border-b border-accent-soft hover:border-accent"
          >
            Crear cuenta
          </Link>
        </div>
      </form>
    </main>
  );
}
