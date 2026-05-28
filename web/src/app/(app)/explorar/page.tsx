import { redirect } from "next/navigation";
import Link from "next/link";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Tag";

type Doc = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  user_id: string;
};

export default async function PaginaExplorar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termino = q?.trim() ?? "";

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let documentos: Doc[] = [];

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
  } else {
    // Sin búsqueda: feed de documentos públicos de terceros
    const { data } = await supabase
      .from("Documentos")
      .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id")
      .eq("confidencialidad", 0)
      .neq("user_id", user.id)
      .order("fecha", { ascending: false })
      .limit(100);
    documentos = data ?? [];
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
            : "Busca entre los documentos que la comunidad ha compartido."}
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
                return (
                  <div key={doc.id} className="grid grid-cols-[44px_1fr_120px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]">
                    <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                      {tipo.slice(0, 3) || "?"}
                    </span>
                    <div className="min-w-0">
                      <Link href={`/documentos/${doc.id}`} className="font-medium hover:text-accent transition-colors truncate block">
                        {doc.nombre}
                      </Link>
                      <p className="text-mute text-[11px] font-mono mt-0.5">
                        {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                      </p>
                    </div>
                    <Tag variant={esPublico ? "pub" : "priv"}>{esPublico ? "público" : "privado"}</Tag>
                    <a href={`/api/documentos/${doc.id}/url`}>
                      <Button variant="ghost" size="sm">Descargar</Button>
                    </a>
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
            return (
              <div key={doc.id} className="rounded-[14px] border border-rule bg-paper p-4 flex gap-4 items-start">
                <span className="w-10 h-12 shrink-0 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[12px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={`/documentos/${doc.id}`} className="font-display font-medium text-[15px] hover:text-accent transition-colors truncate block leading-snug">
                    {doc.nombre}
                  </Link>
                  <p className="text-mute text-[11px] font-mono mt-0.5 mb-3">
                    {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Tag variant="pub">público</Tag>
                    <a href={`/api/documentos/${doc.id}/url`} className="ml-auto">
                      <Button variant="ghost" size="sm">Descargar</Button>
                    </a>
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
