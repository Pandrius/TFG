"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoOrg = { error: string } | { id: string };

export async function crearOrganizacion(
  _previo: ResultadoOrg | undefined,
  datos: FormData,
): Promise<ResultadoOrg> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Crear org e insertarse como admin en una transacción
  const { data: org, error: errorOrg } = await supabase
    .from("organizaciones")
    .insert({ nombre })
    .select("id")
    .single();

  if (errorOrg || !org) return { error: "Error al crear la organización" };

  await supabase
    .from("org_miembros")
    .insert({ org_id: org.id, user_id: user.id, rol: "admin" });

  revalidatePath("/organizaciones");
  return { id: org.id };
}

export async function agregarMiembro(
  orgId: string,
  _previo: { error: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | undefined> {
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!nombreUsuario) return { error: "Introduce un nombre de usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("nombre_usuario", nombreUsuario)
    .single();

  if (!perfil) return { error: `Usuario "${nombreUsuario}" no encontrado` };
  if (perfil.id === user.id) return { error: "Ya eres miembro de esta organización" };

  const { error } = await supabase
    .from("org_miembros")
    .insert({ org_id: orgId, user_id: perfil.id, rol: "miembro" });

  if (error?.code === "23505") return { error: "Ese usuario ya es miembro" };
  if (error) return { error: "Error al añadir el miembro" };

  revalidatePath(`/organizaciones/${orgId}`);
}

export async function expulsarMiembro(orgId: string, userId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("org_miembros")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  revalidatePath(`/organizaciones/${orgId}`);
}

export async function vincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.from("org_documentos").insert({ org_id: orgId, documento_id: documentoId });
  revalidatePath(`/organizaciones/${orgId}`);
}

export async function desvincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase
    .from("org_documentos")
    .delete()
    .eq("org_id", orgId)
    .eq("documento_id", documentoId);
  revalidatePath(`/organizaciones/${orgId}`);
}
