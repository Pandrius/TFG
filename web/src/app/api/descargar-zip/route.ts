import type { NextRequest } from "next/server";
import JSZip from "jszip";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const MAX_IDS = 20;

export async function POST(request: NextRequest) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Lista de documentos no válida." }, { status: 400 });
  }

  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return Response.json({ error: "Lista de documentos no válida." }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return Response.json(
      { error: `Máximo ${MAX_IDS} documentos por descarga.` },
      { status: 400 },
    );
  }

  const admin = crearClienteAdmin();
  const { data: docs } = await admin
    .from("Documentos")
    .select("id, nombre, url, user_id, confidencialidad")
    .in("id", ids as string[]);
  const propietariosIds = [...new Set((docs ?? []).map((d) => d.user_id).filter((id) => id !== user.id))];
  const { data: accesosFavorito } = propietariosIds.length > 0
    ? await admin
        .from("favoritos")
        .select("propietario_id")
        .in("propietario_id", propietariosIds)
        .eq("favorito_id", user.id)
    : { data: [] };
  const propietariosConAcceso = new Set(accesosFavorito?.map((f) => f.propietario_id) ?? []);

  const docsAccesibles = (docs ?? []).filter(
    (d) => d.user_id === user.id || d.confidencialidad === 0 || propietariosConAcceso.has(d.user_id),
  );

  if (docsAccesibles.length === 0) {
    return Response.json(
      { error: "No tienes acceso a ninguno de los documentos seleccionados." },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const nombresUsados = new Set<string>();

  for (const doc of docsAccesibles) {
    const { data: urlData, error: urlError } = await admin.storage
      .from("almacen_documentos")
      .createSignedUrl(doc.url, 60);

    if (urlError || !urlData?.signedUrl) {
      console.warn(`[/api/descargar-zip] no se pudo obtener URL para doc="${doc.id}": ${urlError?.message}`);
      continue;
    }

    let buffer: ArrayBuffer;
    try {
      const res = await fetch(urlData.signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = await res.arrayBuffer();
    } catch (err) {
      console.warn(`[/api/descargar-zip] descarga fallida doc="${doc.id}": ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    let nombreFinal = doc.nombre;
    if (nombresUsados.has(nombreFinal)) {
      const ext = nombreFinal.includes(".") ? `.${nombreFinal.split(".").pop()}` : "";
      const base = nombreFinal.slice(0, nombreFinal.length - ext.length);
      let contador = 2;
      while (nombresUsados.has(nombreFinal)) {
        nombreFinal = `${base} (${contador})${ext}`;
        contador++;
      }
    }
    nombresUsados.add(nombreFinal);
    zip.file(nombreFinal, buffer);
  }

  if (nombresUsados.size === 0) {
    return Response.json(
      { error: "Error al generar el archivo ZIP." },
      { status: 500 },
    );
  }

  let contenido: Uint8Array;
  try {
    contenido = await zip.generateAsync({ type: "uint8array" });
  } catch (err) {
    console.error(`[/api/descargar-zip] error generando ZIP: ${err instanceof Error ? err.message : String(err)}`);
    return Response.json({ error: "Error al generar el archivo ZIP." }, { status: 500 });
  }

  return new Response(contenido.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="documentos.zip"',
      "Content-Length": String(contenido.length),
    },
  });
}
