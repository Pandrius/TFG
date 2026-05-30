"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import FormularioInvitacion, {
  type UsuarioInvitable,
} from "../../documentos/[id]/FormularioInvitacion";

interface Props {
  documentoId: string;
  nombre: string;
  usuarios: UsuarioInvitable[];
}

export function BotonEnviarDocumentoPerfil({ documentoId, nombre, usuarios }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft transition-colors"
        aria-label={`Enviar ${nombre}`}
        title="Enviar"
      >
        <IconoEnviar />
        Enviar
      </button>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo="Enviar documento"
        acciones={
          <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-mute text-[13px]">
            Enviar <span className="font-medium text-ink">{nombre}</span> a:
          </p>
          <FormularioInvitacion
            documentoId={documentoId}
            usuarios={usuarios}
            onEnviado={() => setAbierto(false)}
          />
        </div>
      </Modal>
    </>
  );
}

function IconoEnviar() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}
