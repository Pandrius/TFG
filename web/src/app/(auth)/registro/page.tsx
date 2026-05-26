"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";

import { registrarse } from "../acciones";

export default function PaginaRegistro() {
  const [estado, accion, pendiente] = useActionState(registrarse, undefined);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const noCoinciden =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const errorDe = (campo: string) =>
    estado && "error" in estado && estado.campo === campo
      ? estado.error
      : undefined;

  const errorGeneral =
    estado && "error" in estado && !estado.campo ? estado.error : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action={accion}
        className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]"
      >
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — crea tu cuenta
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Empieza a archivar.
          </h1>
        </header>

        <FormField
          label="Nombre de usuario"
          htmlFor="nombre_usuario"
          hint="3–32 caracteres. Letras, números, punto y guion bajo."
          error={errorDe("nombre_usuario")}
        >
          <Input
            id="nombre_usuario"
            name="nombre_usuario"
            type="text"
            required
            autoComplete="username"
            error={!!errorDe("nombre_usuario")}
          />
        </FormField>

        <FormField label="Nombre completo (opcional)" htmlFor="nombre_completo">
          <Input
            id="nombre_completo"
            name="nombre_completo"
            type="text"
            autoComplete="name"
          />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errorDe("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            error={!!errorDe("email")}
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="password"
          hint="Mínimo 8 caracteres."
          error={errorDe("password")}
        >
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            error={!!errorDe("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <FormField
          label="Confirmar contraseña"
          htmlFor="password_confirm"
          error={
            noCoinciden ? "Las contraseñas no coinciden." : errorDe("password_confirm")
          }
        >
          <PasswordInput
            id="password_confirm"
            name="password_confirm"
            required
            minLength={8}
            autoComplete="new-password"
            error={noCoinciden || !!errorDe("password_confirm")}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </FormField>

        {errorGeneral && <Alert variant="err">{errorGeneral}</Alert>}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          loading={pendiente}
          disabled={noCoinciden}
        >
          {pendiente ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        <p className="text-center text-sm text-mute">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent border-b border-accent-soft hover:border-accent">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
