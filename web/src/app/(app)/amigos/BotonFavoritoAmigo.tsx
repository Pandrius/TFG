"use client";

import { useTransition } from "react";

import { useToast } from "@/components/ui/Toast";
import { alternarFavorito } from "../usuarios/acciones";

interface Props {
  usuarioId: string;
  esFavorito: boolean;
}

export function BotonFavoritoAmigo({ usuarioId, esFavorito }: Props) {
  const [pendiente, startTransition] = useTransition();
  const { mostrar } = useToast();

  const alternar = () => {
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

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendiente}
      aria-pressed={esFavorito}
      title={esFavorito ? "Quitar favorito" : "Agregar a favoritos"}
      className={[
        "w-9 h-9 rounded-full border border-rule grid place-items-center text-lg transition-colors",
        esFavorito
          ? "bg-oro-soft text-oro border-oro-soft"
          : "bg-card text-mute hover:text-oro hover:bg-oro-tint",
        pendiente ? "opacity-50" : "",
      ].join(" ")}
    >
      {esFavorito ? "★" : "☆"}
    </button>
  );
}
