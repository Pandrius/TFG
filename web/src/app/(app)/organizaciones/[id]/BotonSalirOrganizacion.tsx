"use client";

import { Button } from "@/components/ui/Button";
import { salirOrganizacion } from "../acciones";

interface Props {
  orgId: string;
  esAdmin: boolean;
  totalMiembros: number;
  puedeTransferirAdmin: boolean;
}

export function BotonSalirOrganizacion({
  orgId,
  esAdmin,
  totalMiembros,
  puedeTransferirAdmin,
}: Props) {
  const salir = () => {
    if (!window.confirm("Estas seguro de que quieres salir de la organizacion?")) {
      return;
    }

    if (esAdmin && totalMiembros === 1) {
      const confirmaBorrado = window.confirm(
        "Eres el unico miembro. Si sales, la organizacion desaparecera para siempre. Quieres continuar?",
      );
      if (!confirmaBorrado) return;
    }

    if (esAdmin && totalMiembros > 1 && !puedeTransferirAdmin) {
      window.alert(
        "No puedes salir todavia: no hay ningun miembro disponible para recibir el rol de admin.",
      );
      return;
    }

    if (esAdmin && puedeTransferirAdmin) {
      const confirmaTransferencia = window.confirm(
        "Al salir, el rol de admin se transferira automaticamente a otro miembro. Quieres continuar?",
      );
      if (!confirmaTransferencia) return;
    }

    salirOrganizacion(orgId);
  };

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      title="Salir de la organizacion"
      className="w-full justify-center sm:w-auto"
      onClick={salir}
    >
      Salir
    </Button>
  );
}
