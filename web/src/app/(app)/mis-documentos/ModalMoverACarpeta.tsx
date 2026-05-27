"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { moverDocumentoACarpeta } from "./acciones";

interface Props {
  abierto: boolean;
  onClose: () => void;
  docId: string;
  nombre: string;
  carpetas: { id: string; nombre: string }[];
}

export function ModalMoverACarpeta({ abierto, onClose, docId, nombre, carpetas }: Props) {
  const [carpetaId, setCarpetaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const mover = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", docId);
    fd.append("carpeta_id", carpetaId);
    const res = await moverDocumentoACarpeta(undefined, fd);
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
      titulo="Mover a carpeta"
      acciones={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" loading={enviando} onClick={mover}>
            Mover
          </Button>
        </>
      }
    >
      <p className="text-mute text-[13px] mb-4">
        Mover <span className="font-medium text-ink">{nombre}</span> a:
      </p>
      <select
        value={carpetaId}
        onChange={(e) => setCarpetaId(e.target.value)}
        className="w-full rounded-[8px] border border-rule bg-card px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent-tint"
      >
        <option value="">Sin carpeta</option>
        {carpetas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </Modal>
  );
}
