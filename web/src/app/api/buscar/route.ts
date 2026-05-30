import { NextRequest, NextResponse } from "next/server";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface ResultadoBusqueda {
  documentos: { id: string; nombre: string; tipo_archivo: string | null; username: string }[];
  carpetas: { id: string; nombre: string; username: string }[];
  usuarios: {
    id: string;
    nombre_usuario: string;
    nombre_completo: string | null;
    avatar_url: string | null;
  }[];
  organizaciones: { id: string; nombre: string }[];
}

function nombreUsuarioRelacionado(profiles: unknown): string {
  const perfil = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!perfil || typeof perfil !== "object") return "-";
  const nombre = (perfil as { nombre_usuario?: unknown }).nombre_usuario;
  return typeof nombre === "string" && nombre ? nombre : "-";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json<ResultadoBusqueda>({
      documentos: [],
      carpetas: [],
      usuarios: [],
      organizaciones: [],
    });
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const termino = `%${q}%`;
  const admin = crearClienteAdmin();

  const [
    { data: docs },
    { data: capsCandidatas },
    { data: perfiles },
    { data: orgs },
  ] = await Promise.all([
    admin
      .from("Documentos")
      .select("id, nombre, tipo_archivo, profiles!user_id(nombre_usuario)")
      .ilike("nombre", termino)
      .eq("confidencialidad", 0)
      .neq("user_id", user.id)
      .limit(6),
    admin
      .from("carpetas")
      .select("id, nombre, user_id, parent_id, profiles!user_id(nombre_usuario)")
      .ilike("nombre", termino)
      .neq("user_id", user.id)
      .is("org_id", null)
      .limit(6),
    supabase
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo, avatar_url")
      .or(`nombre_usuario.ilike.${termino},nombre_completo.ilike.${termino}`)
      .neq("id", user.id)
      .limit(5),
    supabase
      .from("org_miembros")
      .select("organizaciones ( id, nombre )")
      .eq("user_id", user.id)
      .limit(20),
  ]);

  const ownerIds = [...new Set((capsCandidatas ?? []).map((c) => c.user_id))];
  const [{ data: carpetasOwners }, { data: docsPublicosCarpetas }] =
    ownerIds.length > 0
      ? await Promise.all([
          admin
            .from("carpetas")
            .select("id, parent_id, user_id")
            .in("user_id", ownerIds)
            .is("org_id", null),
          admin
            .from("Documentos")
            .select("id, carpeta_id, user_id")
            .in("user_id", ownerIds)
            .eq("confidencialidad", 0),
        ])
      : [{ data: [] }, { data: [] }];

  const docsFormateados = (docs ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    tipo_archivo: d.tipo_archivo,
    username: nombreUsuarioRelacionado(d.profiles),
  }));

  const capsFormateadas = (capsCandidatas ?? [])
    .filter((c) => carpetaTienePublicos(c.id, carpetasOwners ?? [], docsPublicosCarpetas ?? []))
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      username: nombreUsuarioRelacionado(c.profiles),
    }));

  const todasOrgs = (orgs ?? [])
    .flatMap((m) => {
      const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
      return org ? [org] : [];
    })
    .filter((o) => o.nombre.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 4);

  return NextResponse.json<ResultadoBusqueda>({
    documentos: docsFormateados,
    carpetas: capsFormateadas,
    usuarios: perfiles ?? [],
    organizaciones: todasOrgs,
  });
}

function carpetaTienePublicos(
  carpetaId: string,
  carpetas: { id: string; parent_id: string | null; user_id: string }[],
  documentos: { carpeta_id: string | null; user_id: string }[],
) {
  const descendientes = new Set([carpetaId]);
  let cambio = true;

  while (cambio) {
    cambio = false;
    for (const carpeta of carpetas) {
      if (carpeta.parent_id && descendientes.has(carpeta.parent_id) && !descendientes.has(carpeta.id)) {
        descendientes.add(carpeta.id);
        cambio = true;
      }
    }
  }

  return documentos.some((doc) => doc.carpeta_id && descendientes.has(doc.carpeta_id));
}

