import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { moverDocumento } from "../acciones";

const ETIQUETA_TIPO: Record<string, string> = {
  pdf: "PDF", docx: "DOC", xlsx: "XLS", csv: "CSV", pptx: "PPT", txt: "TXT",
};

export default async function PaginaCarpeta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar propiedad de la carpeta
  const { data: carpeta } = await supabase
    .from("carpetas")
    .select("id, nombre")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!carpeta) redirect("/carpetas");

  // Documentos en esta carpeta
  const { data: docsEnCarpeta } = await supabase
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("user_id", user.id)
    .eq("carpeta_id", id)
    .order("fecha", { ascending: false });

  // Documentos sin carpeta (para poder moverlos aquí)
  const { data: docsSinCarpeta } = await supabase
    .from("Documentos")
    .select("id, nombre, tipo_archivo")
    .eq("user_id", user.id)
    .is("carpeta_id", null)
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{carpeta.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {docsEnCarpeta?.length ?? 0} documento{docsEnCarpeta?.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Documentos en la carpeta */}
      {docsEnCarpeta && docsEnCarpeta.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {docsEnCarpeta.map((doc) => {
            const tipoLabel = ETIQUETA_TIPO[doc.tipo_archivo ?? ""] ?? doc.tipo_archivo ?? "—";
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                  {tipoLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.nombre}</p>
                  {kb && <p className="text-xs text-gray-400">{kb} KB</p>}
                </div>
                <form action={moverDocumento.bind(null, doc.id, null)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Esta carpeta está vacía.</p>
      )}

      {/* Mover documentos sin carpeta a esta */}
      {docsSinCarpeta && docsSinCarpeta.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Añadir documentos
          </h2>
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {docsSinCarpeta.map((doc) => {
              const tipoLabel = ETIQUETA_TIPO[doc.tipo_archivo ?? ""] ?? doc.tipo_archivo ?? "—";
              return (
                <li key={doc.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                    {tipoLabel}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-medium">{doc.nombre}</p>
                  <form action={moverDocumento.bind(null, doc.id, id)}>
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Añadir
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
