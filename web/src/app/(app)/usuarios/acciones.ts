"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

async function obtenerUsuario() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function alternarFavorito(favoritoId: string) {
  const { supabase, user } = await obtenerUsuario();
  if (favoritoId === user.id) return;

  const { data: existente } = await supabase
    .from("favoritos")
    .select("favorito_id")
    .eq("propietario_id", user.id)
    .eq("favorito_id", favoritoId)
    .single();

  if (existente) {
    await supabase
      .from("favoritos")
      .delete()
      .eq("propietario_id", user.id)
      .eq("favorito_id", favoritoId);
  } else {
    // Quitar bloqueo si existe antes de añadir como favorito
    await supabase
      .from("bloqueos")
      .delete()
      .eq("bloqueador_id", user.id)
      .eq("bloqueado_id", favoritoId);

    await supabase
      .from("favoritos")
      .insert({ propietario_id: user.id, favorito_id: favoritoId });
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${favoritoId}`);
  revalidatePath("/compartidos");
}

export async function alternarBloqueo(bloqueadoId: string) {
  const { supabase, user } = await obtenerUsuario();
  if (bloqueadoId === user.id) return;

  const { data: existente } = await supabase
    .from("bloqueos")
    .select("bloqueado_id")
    .eq("bloqueador_id", user.id)
    .eq("bloqueado_id", bloqueadoId)
    .single();

  if (existente) {
    await supabase
      .from("bloqueos")
      .delete()
      .eq("bloqueador_id", user.id)
      .eq("bloqueado_id", bloqueadoId);
  } else {
    // Quitar favorito si existe antes de bloquear
    await supabase
      .from("favoritos")
      .delete()
      .eq("propietario_id", user.id)
      .eq("favorito_id", bloqueadoId);

    await supabase
      .from("bloqueos")
      .insert({ bloqueador_id: user.id, bloqueado_id: bloqueadoId });
  }

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${bloqueadoId}`);
}

type ResultadoUsuario = { ok: true } | { error: string };

export async function solicitarAmistad(receptorId: string): Promise<ResultadoUsuario> {
  const { user } = await obtenerUsuario();
  if (receptorId === user.id) return { error: "No puedes enviarte una solicitud." };

  const admin = crearClienteAdmin();
  const { data: existente, error: errorConsulta } = await admin
    .from("amistades")
    .select("id, estado")
    .or(
      `and(solicitante_id.eq.${user.id},receptor_id.eq.${receptorId}),and(solicitante_id.eq.${receptorId},receptor_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (errorConsulta) {
    console.error("Error checking friendship:", errorConsulta);
    return { error: "No se pudo comprobar la solicitud." };
  }
  if (existente) return { error: "Ya existe una solicitud o amistad." };

  const { error } = await admin
    .from("amistades")
    .insert({ solicitante_id: user.id, receptor_id: receptorId, estado: "pendiente" });
  if (error) {
    console.error("Error creating friendship request:", error);
    return { error: "No se pudo enviar la solicitud." };
  }

  revalidatePath("/amigos");
  revalidatePath(`/usuarios/${receptorId}`);
  return { ok: true };
}

export async function aceptarAmistad(solicitudId: string) {
  const { user } = await obtenerUsuario();
  const admin = crearClienteAdmin();

  await admin
    .from("amistades")
    .update({ estado: "aceptada", fecha_respuesta: new Date().toISOString() })
    .eq("id", solicitudId)
    .eq("receptor_id", user.id)
    .eq("estado", "pendiente");

  revalidatePath("/amigos");
}

export async function rechazarAmistad(solicitudId: string) {
  const { user } = await obtenerUsuario();
  const admin = crearClienteAdmin();

  await admin
    .from("amistades")
    .delete()
    .eq("id", solicitudId)
    .or(`solicitante_id.eq.${user.id},receptor_id.eq.${user.id}`);

  revalidatePath("/amigos");
}

export async function eliminarAmistad(usuarioId: string) {
  const { user } = await obtenerUsuario();
  const admin = crearClienteAdmin();

  await admin
    .from("amistades")
    .delete()
    .or(
      `and(solicitante_id.eq.${user.id},receptor_id.eq.${usuarioId}),and(solicitante_id.eq.${usuarioId},receptor_id.eq.${user.id})`,
    );

  revalidatePath("/amigos");
  revalidatePath(`/usuarios/${usuarioId}`);
}
