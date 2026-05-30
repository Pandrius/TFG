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
  _previo: { error: string } | { ok: true } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: true } | undefined> {
  const userId = String(datos.get("user_id") ?? "").trim();
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!userId && !nombreUsuario) return { error: "Selecciona un usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  // Buscar el perfil por id seleccionado o, como fallback, por nombre exacto.
  let query = admin
    .from("profiles")
    .select("id, nombre_usuario");
  query = userId ? query.eq("id", userId) : query.eq("nombre_usuario", nombreUsuario);
  const { data: perfil } = await query.single();

  if (!perfil) return { error: "Usuario no encontrado" };
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

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: true };
}

export async function invitarMiembroOrg(
  orgId: string,
  _previo: { error: string } | { ok: true } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: true } | undefined> {
  const userId = String(datos.get("user_id") ?? "").trim();
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  if (!userId && !nombreUsuario) return { error: "Selecciona un usuario" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (miMembresia?.rol !== "admin") return { error: "No autorizado" };

  let query = admin.from("profiles").select("id, nombre_usuario");
  query = userId ? query.eq("id", userId) : query.eq("nombre_usuario", nombreUsuario);
  const { data: perfil } = await query.single();

  if (!perfil) return { error: "Usuario no encontrado" };
  if (perfil.id === user.id) return { error: "Ya eres miembro de esta organizacion" };

  const { data: miembroExistente } = await admin
    .from("org_miembros")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", perfil.id)
    .maybeSingle();
  if (miembroExistente) return { error: "Ese usuario ya es miembro" };

  const { error } = await admin.from("org_invitaciones").insert({
    org_id: orgId,
    invitado_id: perfil.id,
    invitador_id: user.id,
    estado: "pendiente",
  });

  if (error?.code === "23505") return { error: "Ese usuario ya tiene una invitacion pendiente" };
  if (error) {
    console.error("Error creating org invitation:", error);
    return { error: "Error al enviar la invitacion" };
  }

  revalidatePath("/buzon");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  return { ok: true };
}

export async function aceptarInvitacionOrg(invitacionId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: invitacion } = await admin
    .from("org_invitaciones")
    .select("id, org_id, invitado_id, estado")
    .eq("id", invitacionId)
    .eq("invitado_id", user.id)
    .eq("estado", "pendiente")
    .single();
  if (!invitacion) return;

  const { error: errorMiembro } = await admin
    .from("org_miembros")
    .insert({ org_id: invitacion.org_id, user_id: user.id, rol: "miembro" });
  if (errorMiembro && errorMiembro.code !== "23505") {
    console.error("Error accepting org invitation:", errorMiembro);
    return;
  }

  await admin
    .from("org_invitaciones")
    .update({ estado: "aceptada", fecha_respuesta: new Date().toISOString() })
    .eq("id", invitacionId)
    .eq("invitado_id", user.id);

  revalidatePath("/buzon");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${invitacion.org_id}`);
}

export async function rechazarInvitacionOrg(invitacionId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  await admin
    .from("org_invitaciones")
    .update({ estado: "rechazada", fecha_respuesta: new Date().toISOString() })
    .eq("id", invitacionId)
    .eq("invitado_id", user.id)
    .eq("estado", "pendiente");

  revalidatePath("/buzon");
}

export async function expulsarMiembro(orgId: string, userId: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (user.id === userId) return;

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (membresia?.rol !== "admin") return;

  const { error } = await admin
    .from("org_miembros")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing org member:", error);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function transferirCreador(
  orgId: string,
  nuevoAdminUserId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === nuevoAdminUserId) return;

  const admin = crearClienteAdmin();
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (miMembresia?.rol !== "admin") return;

  const { data: nuevoAdmin } = await admin
    .from("org_miembros")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", nuevoAdminUserId)
    .single();

  if (!nuevoAdmin) return;

  const { error: errorNuevoAdmin } = await admin
    .from("org_miembros")
    .update({ rol: "admin" })
    .eq("org_id", orgId)
    .eq("user_id", nuevoAdminUserId);

  if (errorNuevoAdmin) {
    console.error("Error promoting org member:", errorNuevoAdmin);
    return;
  }

  const { error: errorActual } = await admin
    .from("org_miembros")
    .update({ rol: "miembro" })
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  if (errorActual) {
    console.error("Error demoting previous org admin:", errorActual);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function vincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (membresia?.rol !== "admin") return;

  const { error } = await admin
    .from("org_documentos")
    .upsert(
      { org_id: orgId, documento_id: documentoId },
      { onConflict: "org_id,documento_id" },
    );

  if (error) {
    console.error("Error linking document to org:", error);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}

export async function subirDocumentoAOrganizacion(
  _previo: { error: string } | { ok: string } | undefined,
  datos: FormData,
): Promise<{ error: string } | { ok: string } | undefined> {
  const orgId = String(datos.get("org_id") ?? "").trim();
  const documentoId = String(datos.get("documento_id") ?? "").trim();
  const carpetaIdRaw = String(datos.get("carpeta_id") ?? "").trim();
  const carpetaId = carpetaIdRaw || null;
  if (!orgId || !documentoId) return { error: "Datos incompletos." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const [{ data: membresia }, { data: doc }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("Documentos")
      .select("id, user_id")
      .eq("id", documentoId)
      .single(),
  ]);

  if (!membresia) return { error: "No perteneces a esa organizacion." };
  if (!doc || doc.user_id !== user.id) return { error: "Documento no encontrado." };

  if (carpetaId) {
    const { data: carpeta } = await admin
      .from("carpetas")
      .select("id, org_id")
      .eq("id", carpetaId)
      .eq("org_id", orgId)
      .single();
    if (!carpeta) return { error: "Carpeta de organizacion no valida." };
  }

  const { error: errorVinculo } = await admin.from("org_documentos").upsert(
    { org_id: orgId, documento_id: documentoId },
    { onConflict: "org_id,documento_id" },
  );
  if (errorVinculo) {
    console.error("Error linking document to org:", errorVinculo);
    return { error: "Error al subir el documento a la organizacion." };
  }

  const { error: errorCarpeta } = await admin
    .from("Documentos")
    .update({ carpeta_id: carpetaId })
    .eq("id", documentoId)
    .eq("user_id", user.id);
  if (errorCarpeta) {
    console.error("Error moving document to org folder:", errorCarpeta);
    return { error: "Documento vinculado, pero no se pudo asignar carpeta." };
  }

  revalidatePath("/mis-documentos");
  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  if (carpetaId) revalidatePath(`/carpetas/${carpetaId}`);
  return { ok: "Documento subido a la organizacion." };
}

export async function desvincularDocumento(
  orgId: string,
  documentoId: string,
): Promise<void> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = crearClienteAdmin();
  const { data: membresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (membresia?.rol !== "admin") return;

  const { error } = await admin
    .from("org_documentos")
    .delete()
    .eq("org_id", orgId)
    .eq("documento_id", documentoId);

  if (error) {
    console.error("Error unlinking document from org:", error);
    return;
  }

  revalidatePath("/organizaciones");
  revalidatePath(`/organizaciones/${orgId}`);
  redirect(`/organizaciones/${orgId}`);
}
