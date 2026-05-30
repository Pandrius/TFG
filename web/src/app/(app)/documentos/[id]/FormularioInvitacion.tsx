"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { invitarUsuario } from "./acciones";

export interface UsuarioInvitable {
  id: string;
  nombre_usuario: string;
  nombre_completo: string | null;
  avatar_url: string | null;
}

interface Props {
  documentoId: string;
  usuarios: UsuarioInvitable[];
  onEnviado?: () => void;
}

export default function FormularioInvitacion({ documentoId, usuarios, onEnviado }: Props) {
  const [consulta, setConsulta] = useState("");
  const [seleccionado, setSeleccionado] = useState<UsuarioInvitable | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();
  const router = useRouter();

  const resultados = useMemo(() => {
    const normal = consulta.trim().toLowerCase();
    if (!normal) return usuarios.slice(0, 8);
    return usuarios
      .filter((u) => {
        const nombre = `${u.nombre_usuario} ${u.nombre_completo ?? ""}`.toLowerCase();
        return nombre.includes(normal);
      })
      .slice(0, 8);
  }, [consulta, usuarios]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleccionado) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("user_id", seleccionado.id);
    fd.append("nombre_usuario", seleccionado.nombre_usuario);
    const res = await invitarUsuario(documentoId, undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: "Documento enviado." });
      setConsulta("");
      setSeleccionado(null);
      setAbierto(false);
      onEnviado?.();
      router.refresh();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <form onSubmit={enviar} className="relative flex gap-2">
      <div className="relative flex-1">
        <Input
          placeholder="Buscar usuario..."
          value={seleccionado ? `@${seleccionado.nombre_usuario}` : consulta}
          onChange={(e) => {
            setConsulta(e.target.value.replace(/^@/, ""));
            setSeleccionado(null);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          disabled={enviando}
          className="w-full"
        />
        {abierto && !seleccionado && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-[10px] border border-rule bg-card shadow-[var(--shadow-2)] py-1">
            {usuarios.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-mute">
                No hay usuarios disponibles para enviar este documento.
              </p>
            ) : resultados.length > 0 ? (
              resultados.map((usuario) => (
                <button
                  key={usuario.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSeleccionado(usuario);
                    setConsulta(usuario.nombre_usuario);
                    setAbierto(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-soft"
                >
                  <Avatar
                    nombreCompleto={usuario.nombre_completo}
                    nombreUsuario={usuario.nombre_usuario}
                    avatarUrl={usuario.avatar_url}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">
                      {usuario.nombre_completo || usuario.nombre_usuario}
                    </span>
                    <span className="block text-[11px] text-mute font-mono">
                      @{usuario.nombre_usuario}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-[13px] text-mute">
                No hay usuarios con esa busqueda.
              </p>
            )}
          </div>
        )}
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={enviando}
        disabled={!seleccionado || enviando}
      >
        Enviar
      </Button>
    </form>
  );
}
