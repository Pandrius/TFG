"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { invitarUsuario } from "./acciones";

export default function FormularioInvitacion({ documentoId }: { documentoId: string }) {
  const [username, setUsername] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrar } = useToast();

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("nombre_usuario", username.trim());
    const res = await invitarUsuario(documentoId, undefined, fd);
    setEnviando(false);
    if (res && "ok" in res) {
      mostrar({ variant: "ok", titulo: "Permiso concedido." });
      setUsername("");
    } else if (res && "error" in res) {
      mostrar({ variant: "err", titulo: res.error });
    }
  };

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <Input
        placeholder="Buscar por @usuario…"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={enviando}
        className="flex-1"
      />
      <Button type="submit" variant="primary" size="md" loading={enviando} disabled={!username.trim()}>
        Invitar
      </Button>
    </form>
  );
}
