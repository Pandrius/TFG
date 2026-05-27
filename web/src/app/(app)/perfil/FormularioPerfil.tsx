"use client";

import { useActionState, useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useToast } from "@/components/ui/Toast";

import { actualizarPerfil, cambiarContrasena } from "./acciones";

interface Props {
  email: string;
  nombreUsuario: string;
  nombreCompleto: string | null;
  avatarUrl: string | null;
}

export function FormularioPerfil({
  email,
  nombreUsuario,
  nombreCompleto,
  avatarUrl: avatarUrlInicial,
}: Props) {
  const { mostrar } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarUrlInicial);

  const [estadoPerfil, accionPerfil, pendientePerfil] = useActionState(
    actualizarPerfil,
    undefined,
  );
  const [estadoPass, accionPass, pendientePass] = useActionState(
    cambiarContrasena,
    undefined,
  );

  useEffect(() => {
    if (estadoPerfil && "ok" in estadoPerfil)
      mostrar({ variant: "ok", titulo: estadoPerfil.ok });
  }, [estadoPerfil]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (estadoPass && "ok" in estadoPass)
      mostrar({ variant: "ok", titulo: estadoPass.ok });
  }, [estadoPass]); // eslint-disable-line react-hooks/exhaustive-deps

  const errCampo = (e: typeof estadoPass, c: string) =>
    e && "error" in e && e.campo === c ? e.error : undefined;
  const errGen = (e: typeof estadoPass) =>
    e && "error" in e && !e.campo ? e.error : undefined;

  return (
    <div className="flex flex-col gap-12">
      {/* Identidad */}
      <section className="flex flex-col gap-6 rounded-[18px] border border-rule bg-card p-7">
        <h2 className="font-display font-medium text-xl tracking-tight m-0">
          Identidad
        </h2>

        <AvatarUpload
          nombreCompleto={nombreCompleto}
          nombreUsuario={nombreUsuario}
          avatarUrl={avatarUrl}
          onSubidoCorrecto={(u) => {
            setAvatarUrl(u);
            mostrar({ variant: "ok", titulo: "Foto actualizada." });
          }}
          onQuitado={() => {
            setAvatarUrl(null);
            mostrar({ variant: "ok", titulo: "Foto eliminada." });
          }}
          onError={(m) => mostrar({ variant: "err", titulo: m })}
        />

        <form action={accionPerfil} className="flex flex-col gap-5">
          <FormField label="Nombre de usuario">
            <Input value={nombreUsuario} disabled />
          </FormField>

          <FormField label="Email">
            <Input value={email} disabled type="email" />
          </FormField>

          <FormField
            label="Nombre completo"
            htmlFor="nombre_completo"
            error={errCampo(estadoPerfil, "nombre_completo")}
          >
            <Input
              id="nombre_completo"
              name="nombre_completo"
              defaultValue={nombreCompleto ?? ""}
              maxLength={80}
            />
          </FormField>

          {errGen(estadoPerfil) && <Alert variant="err">{errGen(estadoPerfil)}</Alert>}

          <div>
            <Button type="submit" variant="accent" size="md" loading={pendientePerfil}>
              {pendientePerfil ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </section>

      {/* Seguridad */}
      <section className="flex flex-col gap-6 rounded-[18px] border border-rule bg-card p-7">
        <h2 className="font-display font-medium text-xl tracking-tight m-0">
          Cambiar contraseña
        </h2>

        <form action={accionPass} className="flex flex-col gap-5">
          <FormField label="Contraseña actual" htmlFor="actual" error={errCampo(estadoPass, "actual")}>
            <PasswordInput
              id="actual"
              name="actual"
              required
              autoComplete="current-password"
              error={!!errCampo(estadoPass, "actual")}
            />
          </FormField>

          <FormField
            label="Nueva contraseña"
            htmlFor="nueva"
            hint="Mínimo 8 caracteres."
            error={errCampo(estadoPass, "nueva")}
          >
            <PasswordInput
              id="nueva"
              name="nueva"
              required
              minLength={8}
              autoComplete="new-password"
              error={!!errCampo(estadoPass, "nueva")}
            />
          </FormField>

          <FormField
            label="Confirmar nueva contraseña"
            htmlFor="confirmar"
            error={errCampo(estadoPass, "confirmar")}
          >
            <PasswordInput
              id="confirmar"
              name="confirmar"
              required
              minLength={8}
              autoComplete="new-password"
              error={!!errCampo(estadoPass, "confirmar")}
            />
          </FormField>

          {errGen(estadoPass) && <Alert variant="err">{errGen(estadoPass)}</Alert>}

          <div>
            <Button type="submit" variant="accent" size="md" loading={pendientePass}>
              {pendientePass ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
