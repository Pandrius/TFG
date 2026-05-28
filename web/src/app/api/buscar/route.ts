import { NextRequest, NextResponse } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface ResultadoBusqueda {
  documentos: { id: string; nombre: string; tipo_archivo: string | null; username: string }[];
  carpetas: { id: string; nombre: string; username: string }[];
  usuarios: { id: string; nombre_usuario: string; nombre_completo: string | null }[];
  organizaciones: { id: string; nombre: string }[];
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

  const [
    { data: docs },
    { data: caps },
    { data: perfiles },
    { data: orgs }
  ] = await Promise.all([
    // Buscar Documentos Públicos de otros usuarios
    supabase
      .from("Documentos")
      .select("id, nombre, tipo_archivo, profiles!user_id(nombre_usuario)")
      .ilike("nombre", termino)
      .eq("confidencialidad", 0)
      .neq("user_id", user.id)
      .limit(6),
    // Buscar Carpetas de otros usuarios (suponiendo que haya política de visibilidad o buscamos todas las de otros)
    supabase
      .from("carpetas")
      .select("id, nombre, profiles!user_id(nombre_usuario)")
      .ilike("nombre", termino)
      .neq("user_id", user.id)
      .limit(4),
    // Buscar Usuarios
    supabase
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo")
      .or(`nombre_usuario.ilike.${termino},nombre_completo.ilike.${termino}`)
      .neq("id", user.id)
      .limit(5),
    // Buscar Organizaciones
    supabase
      .from("org_miembros")
      .select("organizaciones ( id, nombre )")
      .eq("user_id", user.id)
      .limit(20),
  ]);

  // Transformar datos para incluir el username de forma plana
  const docsFormateados = (docs ?? []).map(d => ({
    id: d.id,
    nombre: d.nombre,
    tipo_archivo: d.tipo_archivo,
    username: (d.profiles as any)?.nombre_usuario || "—"
  }));

  const capsFormateadas = (caps ?? []).map(c => ({
    id: c.id,
    nombre: c.nombre,
    username: (c.profiles as any)?.nombre_usuario || "—"
  }));

  // Filtrar orgs por nombre
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
