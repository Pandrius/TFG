"use server";

import { revalidatePath } from "next/cache";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado =
  | { ok: string }
  | { error: string }
  | undefined;

/**
 * Cambia la confidencialidad de un documento del usuario.
 * 0 = público, 1 = privado.
 */
export async function actualizarConfidencialidad(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  const nueva = Number(datos.get("nueva"));
  if (!docId || (nueva !== 0 && nueva !== 1)) {
    return { error: "Datos no válidos." };
  }

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ confidencialidad: nueva })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return {
    ok: nueva === 0 ? "Documento marcado como público." : "Documento marcado como privado.",
  };
}

/** Renombra un documento del usuario. */
export async function renombrarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!docId) return { error: "Documento no válido." };
  if (!nombre) return { error: "El nombre no puede estar vacío." };
  if (nombre.length > 200) return { error: "Máximo 200 caracteres." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  const { error } = await admin
    .from("Documentos")
    .update({ nombre })
    .eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Nombre actualizado." };
}

/** Elimina un documento del usuario (storage + BD). */
export async function eliminarDocumento(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const docId = String(datos.get("doc_id") ?? "");
  if (!docId) return { error: "Documento no válido." };

  const admin = crearClienteAdmin();
  const { data: doc, error: errSel } = await admin
    .from("Documentos")
    .select("user_id, url")
    .eq("id", docId)
    .single();
  if (errSel || !doc) return { error: "Documento no encontrado." };
  if (doc.user_id !== user.id) return { error: "No autorizado." };

  // Borrar el fichero del bucket (best-effort: si falla, igualmente borramos el registro
  // para no dejar al usuario con un documento que no puede gestionar).
  await admin.storage.from("almacen_documentos").remove([doc.url]);

  const { error } = await admin.from("Documentos").delete().eq("id", docId);
  if (error) return { error: error.message };

  revalidatePath("/mis-documentos");
  return { ok: "Documento eliminado." };
}
