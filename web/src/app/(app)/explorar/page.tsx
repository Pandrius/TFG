import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Input } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Tag";
import type { UsuarioInvitable } from "../documentos/[id]/FormularioInvitacion";
import { BotonEnviarDocumentoPerfil } from "../usuarios/[id]/BotonEnviarDocumentoPerfil";

type Doc = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  user_id: string;
  probabilidad: number | null;
};

type PeriodoExplorar = "dia" | "semana" | "mes" | "historia";

export default async function PaginaExplorar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termino = q?.trim() ?? "";
  const cookieStore = await cookies();
  const periodo = normalizarPeriodo(cookieStore.get("dres_explorar_periodo")?.value);
  const desde = fechaInicioPeriodo(periodo);

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let documentos: Doc[] = [];
  let amigosIds = new Set<string>();
  let descargasPorDoc = new Map<string, number>();

  if (termino.length >= 2) {
    // Búsqueda full-text vía RPC (respeta la RLS del usuario)
    const terminoSanitizado = termino
      .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .join(" & ");

    if (terminoSanitizado) {
      const { data } = await supabase.rpc("buscar_documentos", {
        termino: terminoSanitizado,
      });
      documentos = (data as Doc[]) ?? [];
    }

    const docIds = documentos.map((doc) => doc.id);
    if (docIds.length > 0) {
      let consultaDescargas = supabase
        .from("descargas_documentos")
        .select("documento_id, fecha")
        .in("documento_id", docIds);

      if (desde) consultaDescargas = consultaDescargas.gte("fecha", desde.toISOString());

      const { data: descargas } = await consultaDescargas;
      descargasPorDoc = contarDescargas(descargas ?? []);
    }
  } else {
    // Sin búsqueda: feed de documentos públicos de terceros
    const { data } = await supabase
      .from("Documentos")
      .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id, probabilidad")
      .eq("confidencialidad", 0)
      .neq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(100);
    documentos = data ?? [];

    const { data: amistades } = await supabase
      .from("amistades")
      .select("solicitante_id, receptor_id")
      .eq("estado", "aceptada")
      .or(`solicitante_id.eq.${user.id},receptor_id.eq.${user.id}`);

    amigosIds = new Set(
      (amistades ?? []).map((amistad) =>
        amistad.solicitante_id === user.id ? amistad.receptor_id : amistad.solicitante_id,
      ),
    );

    const docIds = documentos.map((doc) => doc.id);
    if (docIds.length > 0) {
      let consultaDescargas = supabase
        .from("descargas_documentos")
        .select("documento_id, fecha")
        .in("documento_id", docIds);

      if (desde) consultaDescargas = consultaDescargas.gte("fecha", desde.toISOString());

      const { data: descargas } = await consultaDescargas;
      descargasPorDoc = contarDescargas(descargas ?? []);
    }

    documentos.sort((a, b) => {
      const amigoA = amigosIds.has(a.user_id) ? 1 : 0;
      const amigoB = amigosIds.has(b.user_id) ? 1 : 0;
      if (amigoA !== amigoB) return amigoB - amigoA;

      const descargasA = descargasPorDoc.get(a.id) ?? 0;
      const descargasB = descargasPorDoc.get(b.id) ?? 0;
      if (descargasA !== descargasB) return descargasB - descargasA;

      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
  }

  // Perfiles de los propietarios
  const userIds = [...new Set(documentos.map((d) => d.user_id))];
  const perfilesById: Record<string, { nombre_completo: string | null; nombre_usuario: string | null }> = {};
  if (userIds.length > 0) {
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, nombre_completo, nombre_usuario")
      .in("id", userIds);
    for (const p of perfiles ?? []) perfilesById[p.id] = p;
  }
  const { data: perfilesDisponibles } = await supabase
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .neq("id", user.id)
    .order("nombre_usuario");
  const usuariosDisponibles: UsuarioInvitable[] = perfilesDisponibles ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— explorar</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          Documentos <em className="italic text-accent">públicos</em>
        </h1>
        <p className="text-mute text-[13px] mt-1">
          {termino
            ? `${documentos.length} resultado${documentos.length !== 1 ? "s" : ""} para "${termino}"`
            : `Primero amigos - despues mas descargados ${etiquetaPeriodo(periodo)}.`}
        </p>
      </div>

      {/* Buscador — form GET que ya funciona */}
      <form method="GET" className="flex gap-2">
        <Input type="search" name="q" defaultValue={termino} placeholder="Buscar documentos…" className="flex-1" />
        <Button type="submit" variant="primary" size="md">Buscar</Button>
        {termino && (
          <a href="/explorar"><Button type="button" variant="ghost" size="md">Limpiar</Button></a>
        )}
      </form>

      {/* Resultados */}
      {documentos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display italic text-accent text-lg mb-1">Sin resultados</p>
          <p className="text-mute text-sm">
            {termino ? "Prueba con otro término de búsqueda." : "No hay documentos públicos disponibles."}
          </p>
        </div>
      ) : termino ? (
        // Lista para búsqueda
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {documentos.map((doc) => {
                const perfil = perfilesById[doc.user_id];
                const autor = doc.user_id === user.id ? "Tú" : (perfil?.nombre_completo || perfil?.nombre_usuario || "—");
                const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
                const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
                const tipo = (doc.tipo_archivo ?? "").toUpperCase();
                const esPublico = doc.confidencialidad === 0;
                const descargas = descargasPorDoc.get(doc.id) ?? 0;
                return (
                  <div key={doc.id} className="grid grid-cols-[44px_1fr_120px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]">
                    <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                      {tipo.slice(0, 3) || "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link href={`/documentos/${doc.id}`} className="min-w-0 font-medium hover:text-accent transition-colors truncate block">
                          {doc.nombre}
                        </Link>
                        <FiabilidadModelo
                          probabilidad={doc.probabilidad}
                          tipoArchivo={doc.tipo_archivo}
                          confidencialidad={doc.confidencialidad}
                        />
                      </div>
                      <p className="text-mute text-[11px] font-mono mt-0.5">
                        {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                      </p>
                    </div>
                    <Tag variant={esPublico ? "pub" : "priv"}>{esPublico ? "público" : "privado"}</Tag>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-mute text-[11px] font-mono">
                        {descargas} desc.
                      </span>
                      <div className="flex items-center justify-end gap-1">
                        {esPublico && (
                          <BotonEnviarDocumentoPerfil
                            documentoId={doc.id}
                            nombre={doc.nombre}
                            usuarios={usuariosDisponibles.filter((u) => u.id !== doc.user_id)}
                          />
                        )}
                        <a href={`/api/documentos/${doc.id}/url`}>
                          <Button variant="ghost" size="sm">Descargar</Button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Grid de tarjetas para feed sin búsqueda
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = doc.user_id === user.id ? "Tú" : (perfil?.nombre_completo || perfil?.nombre_usuario || "—");
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esAmigo = amigosIds.has(doc.user_id);
            const descargas = descargasPorDoc.get(doc.id) ?? 0;
            return (
              <div key={doc.id} className="rounded-[14px] border border-rule bg-paper p-4 flex gap-4 items-start">
                <span className="w-10 h-12 shrink-0 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[12px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href={`/documentos/${doc.id}`} className="min-w-0 font-display font-medium text-[15px] hover:text-accent transition-colors truncate block leading-snug">
                      {doc.nombre}
                    </Link>
                    <FiabilidadModelo
                      probabilidad={doc.probabilidad}
                      tipoArchivo={doc.tipo_archivo}
                      confidencialidad={doc.confidencialidad}
                    />
                  </div>
                  <p className="text-mute text-[11px] font-mono mt-0.5 mb-3">
                    {autor}{esAmigo ? " - amigo" : ""} - {fecha}{kb ? ` - ${kb} KB` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Tag variant="pub">público</Tag>
                    <div className="ml-auto flex flex-col items-end gap-1">
                      <span className="text-mute text-[11px] font-mono">
                        {descargas} desc.
                      </span>
                      <div className="flex items-center justify-end gap-1">
                        <BotonEnviarDocumentoPerfil
                          documentoId={doc.id}
                          nombre={doc.nombre}
                          usuarios={usuariosDisponibles.filter((u) => u.id !== doc.user_id)}
                        />
                        <a href={`/api/documentos/${doc.id}/url`}>
                          <Button variant="ghost" size="sm">Descargar</Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function normalizarPeriodo(valor: string | undefined): PeriodoExplorar {
  if (valor === "dia" || valor === "semana" || valor === "mes" || valor === "historia") return valor;
  return "semana";
}

function fechaInicioPeriodo(periodo: PeriodoExplorar): Date | null {
  if (periodo === "historia") return null;

  const ahora = new Date();
  if (periodo === "dia") {
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }

  if (periodo === "mes") {
    return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  }

  const inicio = new Date(ahora);
  inicio.setDate(inicio.getDate() - 7);
  return inicio;
}

function etiquetaPeriodo(periodo: PeriodoExplorar): string {
  if (periodo === "dia") return "del dia";
  if (periodo === "mes") return "del mes";
  if (periodo === "historia") return "de la historia";
  return "de la semana";
}

function contarDescargas(descargas: { documento_id: string }[]) {
  const conteo = new Map<string, number>();
  for (const descarga of descargas) {
    conteo.set(descarga.documento_id, (conteo.get(descarga.documento_id) ?? 0) + 1);
  }
  return conteo;
}
