"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { agregarMiembro } from "../acciones";

export default function FormularioMiembro({ orgId }: { orgId: string }) {
  const accion = agregarMiembro.bind(null, orgId);
  const [estado, dispatch, pending] = useActionState<{ error: string } | undefined, FormData>(
    accion,
    undefined,
  );

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="nombre_usuario"
          placeholder="Nombre de usuario…"
          required
          disabled={pending}
          className="flex-1"
        />
        <Button type="submit" variant="primary" size="md" loading={pending}>
          Añadir miembro
        </Button>
      </div>
      {estado?.error && (
        <p className="text-danger text-[13px]">{estado.error}</p>
      )}
    </form>
  );
}
