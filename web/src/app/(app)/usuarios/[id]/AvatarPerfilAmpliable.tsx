"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";

interface Props {
  nombreCompleto: string | null;
  nombreUsuario: string;
  avatarUrl: string | null;
}

export function AvatarPerfilAmpliable({
  nombreCompleto,
  nombreUsuario,
  avatarUrl,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const nombre = nombreCompleto || nombreUsuario;
  const inicial = nombre[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full cursor-zoom-in ring-offset-2 hover:ring-2 hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Ampliar foto de perfil"
        title="Ampliar foto de perfil"
      >
        <Avatar
          nombreCompleto={nombreCompleto}
          nombreUsuario={nombreUsuario}
          avatarUrl={avatarUrl}
          size="lg"
        />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="rounded-[18px] border border-rule bg-card shadow-[var(--shadow-3)] p-5 w-full max-w-[380px]">
            <div className="w-72 h-72 max-w-full mx-auto rounded-full overflow-hidden bg-accent-soft text-accent grid place-items-center font-display italic text-7xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                inicial
              )}
            </div>
            <div className="mt-4 text-center">
              <p className="font-medium text-[15px]">{nombre}</p>
              <p className="font-mono text-[11px] text-mute">@{nombreUsuario}</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="mt-4 w-full rounded-full border border-rule px-4 py-2 text-sm hover:bg-soft transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
