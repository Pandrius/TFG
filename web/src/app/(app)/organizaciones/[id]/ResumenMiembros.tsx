"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { expulsarMiembro, transferirCreador } from "../acciones";

export interface MiembroResumen {
  user_id: string;
  rol: string;
  nombre_completo: string | null;
  nombre_usuario: string | null;
}

interface Props {
  orgId: string;
  miembros: MiembroResumen[];
  userId: string;
  esAdmin: boolean;
  totalMiembros: number;
  totalDocumentos: number;
  totalCarpetas: number;
}

export default function ResumenMiembros({
  orgId,
  miembros,
  userId,
  esAdmin,
  totalMiembros,
  totalDocumentos,
  totalCarpetas,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <p className="text-mute text-[12px] font-mono mt-1">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-accent hover:text-accent-hover hover:underline underline-offset-2 transition-colors"
        >
          {totalMiembros} miembro{totalMiembros !== 1 ? "s" : ""}
        </button>{" "}
        - {totalDocumentos} documento{totalDocumentos !== 1 ? "s" : ""} -{" "}
        {totalCarpetas} carpeta{totalCarpetas !== 1 ? "s" : ""}
      </p>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Miembros"
        acciones={
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="max-h-[420px] overflow-y-auto -mx-1 pr-1">
          <div className="flex flex-col divide-y divide-rule rounded-[12px] border border-rule bg-paper overflow-hidden">
            {miembros.length === 0 && (
              <div className="px-4 py-6 text-center text-mute text-sm">
                No se han podido cargar los miembros.
              </div>
            )}
            {miembros.map((miembro) => {
              const esYo = miembro.user_id === userId;
              const nombreUsuario = miembro.nombre_usuario ?? "";
              const etiquetaNombre =
                miembro.nombre_completo || miembro.nombre_usuario || "Sin nombre";

              return (
                <div
                  key={miembro.user_id}
                  className="flex items-center gap-3 px-4 py-3 text-[13px]"
                >
                  <Avatar
                    nombreCompleto={miembro.nombre_completo}
                    nombreUsuario={nombreUsuario}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {etiquetaNombre}
                      {esYo && (
                        <span className="text-mute font-normal text-[12px] ml-1">
                          (tu)
                        </span>
                      )}
                    </p>
                    {miembro.nombre_usuario && (
                      <p className="text-mute text-[11px] font-mono">
                        @{miembro.nombre_usuario}
                      </p>
                    )}
                  </div>
                  <span className="text-mute text-[12px] capitalize font-mono px-2 py-0.5 bg-soft rounded-full shrink-0">
                    {miembro.rol}
                  </span>
                  {esAdmin && !esYo && (
                    <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap">
                      <form action={transferirCreador.bind(null, orgId, miembro.user_id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Hacer creador
                        </Button>
                      </form>
                      <form action={expulsarMiembro.bind(null, orgId, miembro.user_id)}>
                        <Button type="submit" variant="danger" size="sm">
                          Expulsar
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {esAdmin && (
            <p className="text-mute text-[11px] mt-3">
              Al hacer creador a otro miembro, tu rol pasa a miembro.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
