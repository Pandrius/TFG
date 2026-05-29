"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import { agregarDocumentoACarpeta } from "../acciones";

export interface DocumentoDisponibleCarpeta {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
}

interface Props {
  carpetaId: string;
  documentos: DocumentoDisponibleCarpeta[];
}

export function AgregarDocumentosCarpeta({ carpetaId, documentos }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { mostrar } = useToast();

  const agregar = (documentoId: string) => {
    setProcesandoId(documentoId);
    startTransition(async () => {
      const res = await agregarDocumentoACarpeta(carpetaId, documentoId);
      setProcesandoId(null);
      if (res && "ok" in res) {
        mostrar({ variant: "ok", titulo: res.ok });
        router.refresh();
      } else if (res && "error" in res) {
        mostrar({ variant: "err", titulo: res.error });
      }
    });
  };

  return (
    <>
      <Button type="button" variant="primary" size="md" onClick={() => setAbierto(true)}>
        Agregar archivos
      </Button>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Agregar archivos"
        acciones={
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="max-h-[430px] overflow-y-auto -mx-1 pr-1">
          {documentos.length === 0 ? (
            <div className="rounded-[12px] border border-rule bg-paper px-4 py-6 text-center text-mute text-sm">
              No hay documentos disponibles fuera de esta carpeta.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-rule rounded-[12px] border border-rule bg-paper overflow-hidden">
              {documentos.map((doc) => {
                const tipo = (doc.tipo_archivo ?? "").toUpperCase();
                const esPublico = (doc.confidencialidad ?? 1) === 0;
                const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
                const cargando = isPending && procesandoId === doc.id;

                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                    <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px] shrink-0">
                      {tipo.slice(0, 3) || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.nombre}</p>
                      <p className="text-mute text-[11px] font-mono">
                        {kb !== null ? `${kb} KB` : "sin tamaÃ±o"}
                      </p>
                    </div>
                    <Tag variant={esPublico ? "pub" : "priv"}>
                      {esPublico ? "pÃºblico" : "privado"}
                    </Tag>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={cargando}
                      disabled={isPending}
                      onClick={() => agregar(doc.id)}
                    >
                      Agregar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
