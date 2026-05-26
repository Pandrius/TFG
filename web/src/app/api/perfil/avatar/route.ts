import { NextResponse } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const TAMANO_MAX = 2 * 1024 * 1024; // 2 MB (mismo límite que el cliente)

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const form = await request.formData();
  const fichero = form.get("avatar");
  if (!(fichero instanceof File)) {
    return NextResponse.json({ error: "Fichero ausente." }, { status: 400 });
  }
  if (fichero.size > TAMANO_MAX) {
    return NextResponse.json(
      { error: "La imagen pasa de 2 MB." },
      { status: 400 },
    );
  }
  if (fichero.type !== "image/webp") {
    return NextResponse.json(
      { error: "El servidor solo acepta image/webp." },
      { status: 400 },
    );
  }

  const admin = crearClienteAdmin();
  const ruta = `${user.id}/avatar.webp`;
  const buffer = Buffer.from(await fichero.arrayBuffer());

  const { error: errSubida } = await admin.storage
    .from("avatars")
    .upload(ruta, buffer, {
      contentType: "image/webp",
      upsert: true,
    });
  if (errSubida) {
    return NextResponse.json({ error: errSubida.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(ruta);
  // Añadimos un timestamp como query param para invalidar la caché del navegador.
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: errUpdate } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (errUpdate) {
    return NextResponse.json({ error: errUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}

export async function DELETE() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const admin = crearClienteAdmin();
  const ruta = `${user.id}/avatar.webp`;

  await admin.storage.from("avatars").remove([ruta]);
  await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
