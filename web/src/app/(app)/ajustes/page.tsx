import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { PreferenciasApariencia } from "../perfil/PreferenciasApariencia";

export default async function PaginaAjustes() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-10">
      <header>
        <p className="font-display italic text-accent text-sm m-0">- preferencias</p>
        <h1 className="font-display font-medium text-4xl tracking-tight m-0 mt-1">
          Ajustes.
        </h1>
      </header>

      <PreferenciasApariencia />
    </div>
  );
}
