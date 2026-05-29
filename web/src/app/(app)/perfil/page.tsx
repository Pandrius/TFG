import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { FormularioPerfil } from "./FormularioPerfil";
import { PreferenciasApariencia } from "./PreferenciasApariencia";

export default async function PaginaPerfil() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  let { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Si no existe la fila (el trigger de Supabase no la creó), la creamos
  // a partir de los metadatos del usuario de auth.
  if (!perfil) {
    const meta = user.user_metadata ?? {};
    const nombreUsuario: string =
      meta.nombre_usuario ?? user.email?.split("@")[0] ?? `user_${user.id.slice(0, 8)}`;
    await admin.from("profiles").upsert({
      id: user.id,
      nombre_usuario: nombreUsuario,
      nombre_completo: meta.nombre_completo ?? null,
      avatar_url: null,
    });
    perfil = { nombre_usuario: nombreUsuario, nombre_completo: meta.nombre_completo ?? null, avatar_url: null };
  }

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-10">
      <header>
        <p className="font-display italic text-accent text-sm m-0">— tu cuenta</p>
        <h1 className="font-display font-medium text-4xl tracking-tight m-0 mt-1">
          Perfil.
        </h1>
      </header>

      <FormularioPerfil
        email={user.email ?? ""}
        nombreUsuario={perfil.nombre_usuario}
        nombreCompleto={perfil.nombre_completo}
        avatarUrl={perfil.avatar_url}
      />
      <PreferenciasApariencia />
    </div>
  );
}
