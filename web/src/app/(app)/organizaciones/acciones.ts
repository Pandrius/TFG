"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
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

  // Usamos el cliente admin para saltar RLS durante la creación inicial.
  // Esto es necesario porque el .select("id") fallaría ya que el usuario
  // aún no es miembro (la policy de SELECT requiere ser miembro).
  const admin = crearClienteAdmin();
  const { data: org, error: errorOrg } = await admin
    .from("organizaciones")
    .insert({ nombre })
    .select("id")
    .single();

  if (errorOrg || !org) {
    console.error("Error creating org:", errorOrg);
    return { error: "Error al crear la organización" };
  }

  const { error: errorMiembro } = await admin
    .from("org_miembros")
    .insert({ org_id: org.id, user_id: user.id, rol: "admin" });

  if (errorMiembro) {
    console.error("Error adding initial member:", errorMiembro);
    // Podríamos intentar borrar la org si falla esto, pero el admin bypass
    // asegura que no debería fallar por permisos.
    return { error: "Error al configurar la membresía inicial" };
  }

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

  const admin = crearClienteAdmin();

  // Buscar el perfil del usuario a añadir
  const { data: perfil } = await admin
    .from("profiles")
    .select("id")
    .eq("nombre_usuario", nombreUsuario)
    .single();

  if (!perfil) return { error: `Usuario "${nombreUsuario}" no encontrado` };
  if (perfil.id === user.id) return { error: "Ya eres miembro de esta organización" };

  // Insertar como admin para evitar fallos de RLS
  const { error } = await admin
    .from("org_miembros")
    .insert({ org_id: orgId, user_id: perfil.id, rol: "miembro" });

  if (error?.code === "23505") return { error: "Ese usuario ya es miembro" };
  if (error) {
    console.error("Error adding member:", error);
    return { error: "Error al añadir el miembro" };
  }

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
