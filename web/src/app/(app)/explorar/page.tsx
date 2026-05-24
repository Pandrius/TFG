import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

const ETIQUETA_TIPO: Record<string, string> = {
  pdf: "PDF", docx: "DOC", xlsx: "XLS", csv: "CSV", pptx: "PPT", txt: "TXT",
};

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Explorar</h1>
        <p className="mt-1 text-sm text-gray-500">
          {termino ? `Resultados para "${termino}"` : "Documentos públicos de otros usuarios"}
        </p>
      </div>

      {/* Buscador */}
      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={termino}
          placeholder="Buscar en documentos…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Buscar
        </button>
        {termino && (
          <a
            href="/explorar"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Limpiar
          </a>
        )}
      </form>

      {documentos.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = perfil?.nombre_completo || perfil?.nombre_usuario || "—";
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipoLabel = ETIQUETA_TIPO[doc.tipo_archivo ?? ""] ?? doc.tipo_archivo ?? "—";
            const esPropio = doc.user_id === user.id;

            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                  {tipoLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {esPropio ? "Tú" : autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                </div>
                {doc.confidencialidad === 1 && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300">
                    Confidencial
                  </span>
                )}
                <a
                  href={`/api/documentos/${doc.id}/url`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Descargar
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          {termino ? "No se encontraron resultados." : "No hay documentos públicos disponibles."}
        </p>
      )}
    </div>
  );
}
