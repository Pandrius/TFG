"use server";

import { revalidatePath } from "next/cache";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado = { ok: string } | { error: string } | undefined;

export async function crearCarpeta(
  _previo: unknown,
  datos: FormData,
): Promise<Resultado> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const orgId = datos.get("org_id") ? String(datos.get("org_id")) : null;

  if (!nombre) return { error: "El nombre es obligatorio." };
  if (nombre.length > 100) return { error: "Máximo 100 caracteres." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const { error } = await supabase
    .from("carpetas")
    .insert({ nombre, user_id: user.id, org_id: orgId });

  if (error) return { error: "Error al crear la carpeta." };

  revalidatePath("/carpetas");
  if (orgId) revalidatePath(`/organizaciones/${orgId}`);
  return { ok: "Carpeta creada." };
}

export async function renombrarCarpeta(
  _previo: unknown,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const carpetaId = String(datos.get("carpeta_id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!carpetaId || !nombre || nombre.length > 100) return { error: "Datos no válidos." };
  const admin = crearClienteAdmin();
  const { data: c } = await admin.from("carpetas").select("user_id").eq("id", carpetaId).single();
  if (!c || c.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("carpetas").update({ nombre }).eq("id", carpetaId);
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Carpeta renombrada." };
}

export async function eliminarCarpeta(carpetaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const { error } = await supabase
    .from("carpetas")
    .delete()
    .eq("id", carpetaId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Carpeta eliminada." };
}

export async function quitarDocumentoDeCarpeta(docId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };
  const admin = crearClienteAdmin();
  const { data: doc } = await admin.from("Documentos").select("user_id").eq("id", docId).single();
  if (!doc || doc.user_id !== user.id) return { error: "No autorizado." };
  const { error } = await admin.from("Documentos").update({ carpeta_id: null }).eq("id", docId);
  if (error) return { error: error.message };
  revalidatePath("/carpetas");
  return { ok: "Documento quitado de la carpeta." };
}

export async function moverDocumento(
  documentoId: string,
  carpetaId: string | null,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", documentoId)
    .eq("user_id", user.id);

  revalidatePath("/mis-documentos");
  revalidatePath("/carpetas");
}
