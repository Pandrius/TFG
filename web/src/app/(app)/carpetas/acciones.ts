"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoCarpeta = { error: string } | { id: string };

export async function crearCarpeta(
  _previo: ResultadoCarpeta | undefined,
  datos: FormData,
): Promise<ResultadoCarpeta> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("carpetas")
    .insert({ nombre, user_id: user.id })
    .select("id")
    .single();

  if (error) return { error: "Error al crear la carpeta" };

  revalidatePath("/carpetas");
  return { id: data.id };
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

export async function eliminarCarpeta(carpetaId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Los documentos de la carpeta quedan sin carpeta (ON DELETE SET NULL en la FK)
  await supabase
    .from("carpetas")
    .delete()
    .eq("id", carpetaId)
    .eq("user_id", user.id);

  revalidatePath("/carpetas");
}
