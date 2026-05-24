"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

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
}

export async function alternarBloqueo(bloqueadoId: string) {
  const { supabase, user } = await obtenerUsuario();

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
}
