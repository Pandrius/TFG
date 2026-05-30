"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  alternarFavorito,
  eliminarAmistad,
  solicitarAmistad,
} from "../acciones";

interface Props {
  usuarioId: string;
  esFavorito: boolean;
  amistad:
    | { estado: "ninguna" }
    | { estado: "pendiente_enviada" }
    | { estado: "pendiente_recibida" }
    | { estado: "aceptada" };
}

export function AccionesUsuario({ usuarioId, esFavorito, amistad }: Props) {
  const [pendiente, startTransition] = useTransition();
  const { mostrar } = useToast();

  const favorito = () => {
    startTransition(async () => {
      await alternarFavorito(usuarioId);
      mostrar({
        variant: "ok",
        titulo: esFavorito ? "Favorito quitado." : "Favorito agregado.",
        detalle: esFavorito
          ? undefined
          : "Este usuario podra acceder a todos tus documentos.",
      });
    });
  };

  const pedirAmistad = () => {
    startTransition(async () => {
      const res = await solicitarAmistad(usuarioId);
      if ("ok" in res) {
        mostrar({ variant: "ok", titulo: "Solicitud enviada." });
      } else {
        mostrar({ variant: "err", titulo: res.error });
      }
    });
  };

  const quitarAmistad = () => {
    startTransition(async () => {
      await eliminarAmistad(usuarioId);
      mostrar({ variant: "ok", titulo: "Amistad eliminada." });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={favorito}
        disabled={pendiente}
        aria-pressed={esFavorito}
        title={
          esFavorito
            ? "Quitar favorito"
            : "Marcar como favorito y darle acceso a tus documentos"
        }
        className={[
          "w-10 h-10 rounded-full border border-rule grid place-items-center text-xl transition-colors",
          esFavorito
            ? "bg-oro-soft text-oro border-oro-soft"
            : "bg-card text-mute hover:text-oro hover:bg-oro-tint",
          pendiente ? "opacity-50" : "",
        ].join(" ")}
      >
        {esFavorito ? "★" : "☆"}
      </button>

      {amistad.estado === "ninguna" && (
        <Button type="button" variant="primary" size="sm" onClick={pedirAmistad} disabled={pendiente}>
          Agregar amigo
        </Button>
      )}
      {amistad.estado === "pendiente_enviada" && (
        <Button type="button" variant="ghost" size="sm" disabled>
          Solicitud enviada
        </Button>
      )}
      {amistad.estado === "pendiente_recibida" && (
        <Button type="button" variant="ghost" size="sm" disabled>
          Solicitud pendiente
        </Button>
      )}
      {amistad.estado === "aceptada" && (
        <Button type="button" variant="ghost" size="sm" onClick={quitarAmistad} disabled={pendiente}>
          Amigos
        </Button>
      )}
    </div>
  );
}
