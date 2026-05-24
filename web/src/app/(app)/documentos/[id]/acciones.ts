"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoAccion = { error: string } | { ok: true };

export async function invitarUsuario(
  documentoId: string,
  _previo: ResultadoAccion | undefined,
  datos: FormData,
): Promise<ResultadoAccion> {
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!nombreUsuario) return { error: "Introduce un nombre de usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar propiedad
  const { data: doc } = await supabase
    .from("Documentos")
    .select("id")
    .eq("id", documentoId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return { error: "No tienes permiso para gestionar este documento" };

  // Buscar el usuario invitado por nombre_usuario
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("nombre_usuario", nombreUsuario)
    .single();
  if (!perfil) return { error: `Usuario "${nombreUsuario}" no encontrado` };

  if (perfil.id === user.id) return { error: "No puedes invitarte a ti mismo" };

  const { error } = await supabase
    .from("Permisos")
    .insert({ documento_id: documentoId, inv_user_id: perfil.id });

  if (error?.code === "23505") return { error: "Ese usuario ya tiene acceso" };
  if (error) return { error: "Error al conceder el permiso" };

  revalidatePath(`/documentos/${documentoId}`);
  return { ok: true };
}

export async function quitarPermiso(
  documentoId: string,
  permisoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar propiedad antes de borrar
  const { data: doc } = await supabase
    .from("Documentos")
    .select("id")
    .eq("id", documentoId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return;

  await supabase.from("Permisos").delete().eq("id", permisoId);
  revalidatePath(`/documentos/${documentoId}`);
}
