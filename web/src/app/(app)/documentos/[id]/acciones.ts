"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type ResultadoAccion = { error: string } | { ok: true };

export async function invitarUsuario(
  documentoId: string,
  _previo: ResultadoAccion | undefined,
  datos: FormData,
): Promise<ResultadoAccion> {
  const userId = String(datos.get("user_id") ?? "").trim();
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!userId && !nombreUsuario) return { error: "Selecciona un usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  // Verificar propiedad
  const { data: doc } = await admin
    .from("Documentos")
    .select("id")
    .eq("id", documentoId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return { error: "No tienes permiso para gestionar este documento" };

  // Buscar el usuario invitado por id seleccionado o nombre exacto.
  let query = admin
    .from("profiles")
    .select("id, nombre_usuario");
  query = userId ? query.eq("id", userId) : query.eq("nombre_usuario", nombreUsuario);
  const { data: perfil } = await query.single();
  if (!perfil) return { error: "Usuario no encontrado" };

  if (perfil.id === user.id) return { error: "No puedes invitarte a ti mismo" };

  const { error } = await admin
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
  const admin = crearClienteAdmin();
  const { data: doc } = await admin
    .from("Documentos")
    .select("id")
    .eq("id", documentoId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return;

  await admin.from("Permisos").delete().eq("id", permisoId);
  revalidatePath(`/documentos/${documentoId}`);
}
