"use client";

import { useMemo, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { solicitarAmistad } from "../usuarios/acciones";

export interface UsuarioParaAmistad {
  id: string;
  nombre_usuario: string;
  nombre_completo: string | null;
  avatar_url: string | null;
}

interface Props {
  usuarios: UsuarioParaAmistad[];
}

export function AgregarAmigo({ usuarios }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const { mostrar } = useToast();

  const resultados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return usuarios.slice(0, 8);
    return usuarios
      .filter((u) => `${u.nombre_usuario} ${u.nombre_completo ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [consulta, usuarios]);

  const enviar = (usuarioId: string) => {
    setProcesandoId(usuarioId);
    startTransition(async () => {
      const res = await solicitarAmistad(usuarioId);
      setProcesandoId(null);
      if ("ok" in res) {
        mostrar({ variant: "ok", titulo: "Solicitud enviada." });
        setConsulta("");
      } else {
        mostrar({ variant: "err", titulo: res.error });
      }
    });
  };

  return (
    <>
      <Button type="button" variant="primary" size="md" onClick={() => setAbierto(true)}>
        Agregar amigo
      </Button>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Agregar amigo"
        acciones={
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar por nombre o usuario..."
            autoFocus
          />

          <div className="max-h-[360px] overflow-y-auto rounded-[12px] border border-rule bg-paper">
            {resultados.length === 0 ? (
              <p className="px-4 py-6 text-center text-mute text-sm">
                No hay usuarios disponibles.
              </p>
            ) : (
              resultados.map((usuario) => {
                const cargando = pendiente && procesandoId === usuario.id;
                return (
                  <div
                    key={usuario.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-rule last:border-b-0"
                  >
                    <Avatar
                      nombreCompleto={usuario.nombre_completo}
                      nombreUsuario={usuario.nombre_usuario}
                      avatarUrl={usuario.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[13px] truncate">
                        {usuario.nombre_completo || usuario.nombre_usuario}
                      </p>
                      <p className="text-mute text-[11px] font-mono">
                        @{usuario.nombre_usuario}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={cargando}
                      disabled={pendiente}
                      onClick={() => enviar(usuario.id)}
                    >
                      Solicitar
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
