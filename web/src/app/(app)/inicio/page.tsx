import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaInicioApp() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre_usuario, nombre_completo")
    .eq("id", user.id)
    .single();

  const nombre =
    perfil?.nombre_completo || perfil?.nombre_usuario || user.email;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Hola, {nombre}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Tu sesión está activa. La subida y consulta de documentos llegará en los
        próximos hitos del proyecto.
      </p>
    </div>
  );
}
