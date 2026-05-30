"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { agregarMiembro } from "../acciones";

export interface UsuarioDisponible {
  id: string;
  nombre_usuario: string | null;
  nombre_completo: string | null;
}

interface Props {
  orgId: string;
  usuarios: UsuarioDisponible[];
}

export default function FormularioMiembro({ orgId, usuarios }: Props) {
  const router = useRouter();
  const accion = agregarMiembro.bind(null, orgId);
  const [estado, dispatch, pending] = useActionState<{ error: string } | { ok: true } | undefined, FormData>(
    accion,
    undefined,
  );
  const [consulta, setConsulta] = useState("");
  const [seleccionado, setSeleccionado] = useState<UsuarioDisponible | null>(null);
  const [abierto, setAbierto] = useState(false);

  const filtrados = useMemo(() => {
    const normal = consulta.trim().toLowerCase();
    if (!normal) return usuarios.slice(0, 8);
    return usuarios
      .filter((u) => {
        const usuario = u.nombre_usuario?.toLowerCase() ?? "";
        const nombre = u.nombre_completo?.toLowerCase() ?? "";
        return usuario.includes(normal) || nombre.includes(normal);
      })
      .slice(0, 8);
  }, [consulta, usuarios]);

  const seleccionar = (usuario: UsuarioDisponible) => {
    setSeleccionado(usuario);
    setConsulta(usuario.nombre_usuario ? `@${usuario.nombre_usuario}` : (usuario.nombre_completo ?? ""));
    setAbierto(false);
  };

  useEffect(() => {
    if (estado && "ok" in estado) {
      router.refresh();
    }
  }, [estado, router]);

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      <input type="hidden" name="user_id" value={seleccionado?.id ?? ""} />
      <input type="hidden" name="nombre_usuario" value={seleccionado?.nombre_usuario ?? ""} />

      <div className="flex gap-2 items-start">
        <div className="relative flex-1">
          <Input
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setSeleccionado(null);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            placeholder="Buscar usuario por nombre o @usuario..."
            disabled={pending || usuarios.length === 0}
            className="flex-1"
            autoComplete="off"
          />
          {abierto && !pending && usuarios.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setAbierto(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-[10px] border border-rule bg-card shadow-[var(--shadow-2)] py-1">
                {filtrados.length > 0 ? (
                  filtrados.map((usuario) => (
                    <button
                      key={usuario.id}
                      type="button"
                      onClick={() => seleccionar(usuario)}
                      className="w-full px-3 py-2 text-left hover:bg-soft flex items-center gap-3"
                    >
                      <Avatar
                        nombreCompleto={usuario.nombre_completo}
                        nombreUsuario={usuario.nombre_usuario ?? "Usuario"}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium truncate">
                          {usuario.nombre_completo || usuario.nombre_usuario || "Usuario"}
                        </span>
                        {usuario.nombre_usuario && (
                          <span className="block text-[11px] font-mono text-mute truncate">
                            @{usuario.nombre_usuario}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-[13px] text-mute">
                    No hay usuarios disponibles con esa busqueda.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={pending}
          disabled={!seleccionado || pending}
        >
          Anadir miembro
        </Button>
      </div>
      {usuarios.length === 0 && (
        <p className="text-mute text-[13px]">No hay usuarios disponibles para anadir.</p>
      )}
      {estado && "error" in estado && (
        <p className="text-danger text-[13px]">{estado.error}</p>
      )}
    </form>
  );
}
