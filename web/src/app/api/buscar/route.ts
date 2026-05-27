import { NextRequest, NextResponse } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export interface ResultadoBusqueda {
  documentos: { id: string; nombre: string; tipo_archivo: string | null }[];
  usuarios: { id: string; nombre_usuario: string; nombre_completo: string | null }[];
  organizaciones: { id: string; nombre: string }[];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json<ResultadoBusqueda>({
      documentos: [],
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

  const [{ data: docs }, { data: perfiles }, { data: orgs }] = await Promise.all([
    supabase
      .from("Documentos")
      .select("id, nombre, tipo_archivo")
      .eq("user_id", user.id)
      .ilike("nombre", termino)
      .limit(6),
    supabase
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo")
      .or(`nombre_usuario.ilike.${termino},nombre_completo.ilike.${termino}`)
      .neq("id", user.id)
      .limit(5),
    supabase
      .from("org_miembros")
      .select("organizaciones ( id, nombre )")
      .eq("user_id", user.id)
      .limit(20),
  ]);

  // Filtrar orgs por nombre
  const todasOrgs = (orgs ?? [])
    .flatMap((m) => {
      const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
      return org ? [org] : [];
    })
    .filter((o) => o.nombre.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 4);

  return NextResponse.json<ResultadoBusqueda>({
    documentos: docs ?? [],
    usuarios: perfiles ?? [],
    organizaciones: todasOrgs,
  });
}
