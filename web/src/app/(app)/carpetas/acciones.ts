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
  const parentId = datos.get("parent_id") ? String(datos.get("parent_id")) : null;

  if (!nombre) return { error: "El nombre es obligatorio." };
  if (nombre.length > 100) return { error: "Máximo 100 caracteres." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const admin = crearClienteAdmin();

  if (orgId) {
    const { data: membresia } = await admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membresia) return { error: "No autorizado." };
  }

  if (parentId) {
    const { data: padre } = await admin
      .from("carpetas")
      .select("id, user_id, org_id")
      .eq("id", parentId)
      .single();

    if (!padre || padre.user_id !== user.id || (padre.org_id ?? null) !== orgId) {
      return { error: "Carpeta padre no valida." };
    }
  }

  const nuevaCarpeta: {
    nombre: string;
    user_id: string;
    org_id: string | null;
    parent_id?: string;
  } = { nombre, user_id: user.id, org_id: orgId };
  if (parentId) nuevaCarpeta.parent_id = parentId;

  const { error } = await admin.from("carpetas").insert(nuevaCarpeta);

  if (error) {
    console.error("Error creating folder:", error);
    return { error: "Error al crear la carpeta." };
  }

  revalidatePath("/carpetas");
  revalidatePath("/mis-documentos");
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
  revalidatePath("/mis-documentos");
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
  revalidatePath("/mis-documentos");
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

export async function agregarDocumentoACarpeta(
  carpetaId: string,
  documentoId: string,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SesiÃ³n expirada." };

  const admin = crearClienteAdmin();
  const { data: carpeta } = await admin
    .from("carpetas")
    .select("id, user_id")
    .eq("id", carpetaId)
    .single();
  if (!carpeta || carpeta.user_id !== user.id) return { error: "No autorizado." };

  const { data: doc } = await admin
    .from("Documentos")
    .select("id, user_id")
    .eq("id", documentoId)
    .single();
  if (!doc || doc.user_id !== user.id) return { error: "Documento no encontrado." };

  const { error } = await admin
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", documentoId);
  if (error) return { error: error.message };

  revalidatePath("/carpetas");
  revalidatePath(`/carpetas/${carpetaId}`);
  revalidatePath("/mis-documentos");
  return { ok: "Documento agregado a la carpeta." };
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
