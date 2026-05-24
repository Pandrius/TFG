import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const DURACION_URL = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = crearClienteAdmin();
  const { data: doc } = await admin
    .from("Documentos")
    .select("url, user_id, confidencialidad")
    .eq("id", id)
    .single();

  const tieneAcceso = doc?.url && (doc.user_id === user.id || doc.confidencialidad === 0);
  if (!tieneAcceso) {
    return NextResponse.json(
      { error: "Documento no encontrado o sin acceso" },
      { status: 404 },
    );
  }

  const { data: urlData, error } = await admin.storage
    .from("almacen_documentos")
    .createSignedUrl(doc.url, DURACION_URL);

  if (error || !urlData?.signedUrl) {
    return NextResponse.json(
      { error: "Error al generar el enlace de descarga" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(urlData.signedUrl);
}
