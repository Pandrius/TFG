"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

import { eliminarDocumento } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: string;
  nombre: string;
}

export function ModalEliminar({ abierto, onClose, docId, nombre }: Props) {
  const { mostrar } = useToast();
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", docId);
    const res = await eliminarDocumento(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
      onClose();
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo="¿Eliminar este documento?"
      tono="danger"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={enviando}
            onClick={confirmar}
          >
            Sí, eliminar
          </Button>
        </>
      }
    >
      <p className="text-mute text-[13px] leading-[1.55] m-0">
        Se eliminará <span className="font-medium text-ink">{nombre}</span> de
        tu archivo. Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
}
