"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

import { actualizarConfidencialidad } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: number;
  nombre: string;
  tipo: string;
}

export function ModalHacerPublico({
  abierto,
  onClose,
  docId,
  nombre,
  tipo,
}: Props) {
  const { mostrar } = useToast();
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", String(docId));
    fd.append("nueva", "0");
    const res = await actualizarConfidencialidad(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      cerrar();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  const cerrar = () => {
    setConfirmado(false);
    onClose();
  };

  return (
    <Modal
      abierto={abierto}
      onClose={cerrar}
      titulo="¿Hacer este documento público?"
      tono="warn"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!confirmado || enviando}
            loading={enviando}
            onClick={confirmar}
          >
            Sí, hacerlo público
          </Button>
        </>
      }
    >
      <p className="text-mute text-[13px] leading-[1.55] m-0 mb-4">
        Cualquiera con cuenta podrá verlo y descargarlo desde "Explorar". Esta
        acción se puede revertir, pero los accesos quedan registrados.
      </p>

      <div className="flex items-center gap-3 p-[10px_14px] border border-rule rounded-[10px] bg-paper mb-3.5">
        <span className="w-7 h-8 rounded-[5px] bg-card border border-rule grid place-items-center font-display italic text-accent text-[13px]">
          {tipo.slice(0, 3).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="font-medium text-[13px] truncate">{nombre}</div>
          <div className="text-mute text-[11px] font-mono">clasificado como privado</div>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer select-none">
        <span
          onClick={() => setConfirmado((v) => !v)}
          className={[
            "w-[18px] h-[18px] rounded-[5px] border-[1.5px] grid place-items-center transition-all",
            confirmado
              ? "bg-accent border-accent"
              : "bg-card border-rule",
          ].join(" ")}
        >
          {confirmado && (
            <span className="text-white text-[11px] font-semibold">✓</span>
          )}
        </span>
        He revisado el documento y confirmo que no contiene datos personales ni
        información confidencial.
      </label>
    </Modal>
  );
}
