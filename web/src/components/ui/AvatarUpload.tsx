"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

interface Props {
  nombreCompleto: string | null;
  nombreUsuario: string;
  avatarUrl: string | null;
  onSubidoCorrecto: (urlNueva: string) => void;
  onQuitado: () => void;
  onError: (mensaje: string) => void;
}

const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB
const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];
const LADO_DESTINO = 256;

export function AvatarUpload({
  nombreCompleto,
  nombreUsuario,
  avatarUrl,
  onSubidoCorrecto,
  onQuitado,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const nombre = nombreCompleto || nombreUsuario;
  const inicial = nombre[0]?.toUpperCase() ?? "?";

  const elegir = () => inputRef.current?.click();

  useEffect(() => {
    if (!ampliado) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliado(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ampliado]);

  const procesar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichero = e.target.files?.[0];
    e.target.value = "";
    if (!fichero) return;
    if (!TIPOS_OK.includes(fichero.type)) {
      return onError("El formato debe ser JPG, PNG o WEBP.");
    }
    if (fichero.size > TAMANO_MAX) {
      return onError("La imagen no puede pasar de 2 MB.");
    }

    setSubiendo(true);
    try {
      const blob = await recortarCuadradoAWebp(fichero);
      const fd = new FormData();
      fd.append("avatar", blob, "avatar.webp");
      const res = await fetch("/api/perfil/avatar", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo subir el avatar.");
      }
      onSubidoCorrecto(data.url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    setSubiendo(true);
    try {
      const res = await fetch("/api/perfil/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "No se pudo quitar el avatar.");
      }
      onQuitado();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          className="rounded-full cursor-zoom-in ring-offset-2 hover:ring-2 hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Ampliar foto de perfil"
          title="Ampliar foto de perfil"
        >
          <Avatar
            nombreCompleto={nombreCompleto}
            nombreUsuario={nombreUsuario}
            avatarUrl={avatarUrl}
            size="xl"
          />
        </button>
        {subiendo && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/60">
            <span className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="primary" size="sm" onClick={elegir} disabled={subiendo}>
          {avatarUrl ? "Cambiar foto" : "Subir foto"}
        </Button>
        {avatarUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={quitar} disabled={subiendo}>
            Quitar foto
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={procesar}
        />
        <p className="text-xs text-mute">JPG, PNG o WEBP. Máximo 2 MB.</p>
      </div>
      {ampliado && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAmpliado(false);
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
              onClick={() => setAmpliado(false)}
              className="mt-4 w-full rounded-full border border-rule px-4 py-2 text-sm hover:bg-soft transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Recorta la imagen al cuadrado centrado y la exporta como WEBP 256×256.
async function recortarCuadradoAWebp(fichero: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("No se pudo leer el fichero."));
    fr.readAsDataURL(fichero);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Imagen no válida."));
    i.src = dataUrl;
  });

  const lado = Math.min(img.width, img.height);
  const sx = (img.width - lado) / 2;
  const sy = (img.height - lado) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = LADO_DESTINO;
  canvas.height = LADO_DESTINO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible.");
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO_DESTINO, LADO_DESTINO);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Error al codificar la imagen."))),
      "image/webp",
      0.9,
    );
  });
}
