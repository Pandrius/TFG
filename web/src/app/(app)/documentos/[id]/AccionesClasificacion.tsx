"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ModalHacerPublico } from "@/app/(app)/mis-documentos/ModalHacerPublico";
import { useToast } from "@/components/ui/Toast";
import { actualizarConfidencialidad } from "@/app/(app)/mis-documentos/acciones";

interface Props {
  docId: string;
  nombre: string;
  tipo: string;
  esPublico: boolean;
}

export default function AccionesClasificacion({ docId, nombre, tipo, esPublico }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const hacerPrivado = async () => {
    setEnviando(true);
    const fd = new FormData();
    fd.append("doc_id", docId);
    fd.append("nueva", "1");
    const res = await actualizarConfidencialidad(undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: res.ok });
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  if (esPublico) {
    return (
      <Button variant="ghost" size="md" onClick={hacerPrivado} loading={enviando}>
        Marcar como privado
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="md" onClick={() => setModalAbierto(true)}>
        Hacer público
      </Button>
      <ModalHacerPublico
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        docId={docId}
        nombre={nombre}
        tipo={tipo}
      />
    </>
  );
}
