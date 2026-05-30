import type { NextRequest } from "next/server";
import JSZip from "jszip";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type Carpeta = {
  id: string;
  nombre: string;
  user_id: string;
  parent_id: string | null;
};

type Documento = {
  id: string;
  nombre: string;
  url: string;
  user_id: string;
  carpeta_id: string | null;
  confidencialidad: number | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = crearClienteAdmin();
  const { data: carpeta } = await admin
    .from("carpetas")
    .select("id, nombre, user_id, parent_id")
    .eq("id", id)
    .single();
  if (!carpeta) {
    return Response.json({ error: "Carpeta no encontrada." }, { status: 404 });
  }

  const { data: carpetasData } = await admin
    .from("carpetas")
    .select("id, nombre, user_id, parent_id")
    .eq("user_id", carpeta.user_id)
    .is("org_id", null);
  const carpetas = (carpetasData ?? []) as Carpeta[];
  const idsDescendientes = obtenerIdsDescendientes(carpetas, id);
  const { data: accesoPorFavorito } = await admin
    .from("favoritos")
    .select("propietario_id")
    .eq("propietario_id", carpeta.user_id)
    .eq("favorito_id", user.id)
    .maybeSingle();
  const tieneAccesoCompleto = carpeta.user_id === user.id || !!accesoPorFavorito;

  let query = admin
    .from("Documentos")
    .select("id, nombre, url, user_id, carpeta_id, confidencialidad")
    .eq("user_id", carpeta.user_id)
    .in("carpeta_id", idsDescendientes);

  if (!tieneAccesoCompleto) query = query.eq("confidencialidad", 0);

  const { data: docsData } = await query;
  const docs = (docsData ?? []) as Documento[];

  if (docs.length === 0) {
    return Response.json(
      { error: "La carpeta no contiene documentos descargables." },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const nombresUsados = new Set<string>();

  for (const doc of docs) {
    const { data: urlData, error: urlError } = await admin.storage
      .from("almacen_documentos")
      .createSignedUrl(doc.url, 60);
    if (urlError || !urlData?.signedUrl) continue;

    let buffer: ArrayBuffer;
    try {
      const res = await fetch(urlData.signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = await res.arrayBuffer();
    } catch {
      continue;
    }

    const ruta = rutaDocumento(doc, carpetas, carpeta.id);
    const nombreFinal = nombreUnico(ruta, nombresUsados);
    nombresUsados.add(nombreFinal);
    zip.file(nombreFinal, buffer);
  }

  if (nombresUsados.size === 0) {
    return Response.json({ error: "Error al generar el ZIP." }, { status: 500 });
  }

  const contenido = await zip.generateAsync({ type: "uint8array" });
  const nombreZip = normalizarNombreArchivo(carpeta.nombre || "carpeta");

  return new Response(contenido.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreZip}.zip"`,
      "Content-Length": String(contenido.length),
    },
  });
}

function obtenerIdsDescendientes(carpetas: Carpeta[], carpetaId: string) {
  const ids = new Set([carpetaId]);
  let cambio = true;

  while (cambio) {
    cambio = false;
    for (const carpeta of carpetas) {
      if (carpeta.parent_id && ids.has(carpeta.parent_id) && !ids.has(carpeta.id)) {
        ids.add(carpeta.id);
        cambio = true;
      }
    }
  }

  return [...ids];
}

function rutaDocumento(doc: Documento, carpetas: Carpeta[], carpetaRaizId: string) {
  const carpetasPorId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const partes: string[] = [doc.nombre];
  let actual = doc.carpeta_id ? carpetasPorId.get(doc.carpeta_id) ?? null : null;

  while (actual && actual.id !== carpetaRaizId) {
    partes.unshift(actual.nombre);
    actual = actual.parent_id ? carpetasPorId.get(actual.parent_id) ?? null : null;
  }

  return partes.map(normalizarNombreArchivo).join("/");
}

function nombreUnico(nombre: string, usados: Set<string>) {
  if (!usados.has(nombre)) return nombre;

  const partes = nombre.split("/");
  const archivo = partes.pop() ?? nombre;
  const ext = archivo.includes(".") ? `.${archivo.split(".").pop()}` : "";
  const base = archivo.slice(0, archivo.length - ext.length);
  let contador = 2;
  let candidato = nombre;

  while (usados.has(candidato)) {
    candidato = [...partes, `${base} (${contador})${ext}`].join("/");
    contador++;
  }

  return candidato;
}

function normalizarNombreArchivo(nombre: string) {
  return nombre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "archivo";
}
