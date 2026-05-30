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

  const { data: doc } = await admin
    .from("Documentos")
    .select("id, user_id, confidencialidad")
    .eq("id", documentoId)
    .single();
  if (!doc) return { error: "Documento no encontrado" };

  const [{ data: permisoActual }, { data: favoritoActual }] = await Promise.all([
    admin
      .from("Permisos")
      .select("id")
      .eq("documento_id", documentoId)
      .eq("inv_user_id", user.id)
      .maybeSingle(),
    admin
      .from("favoritos")
      .select("propietario_id")
      .eq("propietario_id", doc.user_id)
      .eq("favorito_id", user.id)
      .maybeSingle(),
  ]);

  const puedeCompartir =
    doc.user_id === user.id ||
    doc.confidencialidad === 0 ||
    !!permisoActual ||
    !!favoritoActual;
  if (!puedeCompartir) return { error: "No tienes permiso para enviar este documento" };

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
    .insert({ documento_id: documentoId, inv_user_id: perfil.id, sender_id: user.id });

  if (error?.code === "23505") return { error: "Ese usuario ya tiene acceso" };
  if (error?.code === "PGRST204") {
    const { error: fallbackError } = await admin
      .from("Permisos")
      .insert({ documento_id: documentoId, inv_user_id: perfil.id });
    if (fallbackError?.code === "23505") return { error: "Ese usuario ya tiene acceso" };
    if (fallbackError) return { error: "Error al conceder el permiso" };
    revalidatePath(`/documentos/${documentoId}`);
    revalidatePath("/compartidos");
    return { ok: true };
  }
  if (error) return { error: "Error al conceder el permiso" };

  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/compartidos");
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
