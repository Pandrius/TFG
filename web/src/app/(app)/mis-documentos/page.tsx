import Link from "next/link";
import { redirect } from "next/navigation";

import SubidaArchivos from "@/components/SubidaArchivos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const ETIQUETA: Record<number, { texto: string; clases: string }> = {
  0: {
    texto: "Público",
    clases:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  1: {
    texto: "Confidencial",
    clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

const ICONO_TIPO: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  xlsx: "XLS",
  csv: "CSV",
  pptx: "PPT",
  txt: "TXT",
};

export default async function PaginaMisDocumentos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: documentos } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Mis documentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          {documentos?.length ?? 0} documento
          {documentos?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <SubidaArchivos />

      {documentos && documentos.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {documentos.map((doc) => {
            const etiqueta = ETIQUETA[doc.confidencialidad ?? 1] ?? ETIQUETA[1];
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes
              ? Math.round(doc.tamano_bytes / 1024)
              : null;
            const tipoLabel =
              ICONO_TIPO[doc.tipo_archivo ?? ""] ?? doc.tipo_archivo ?? "—";

            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                  {tipoLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {fecha}
                    {kb ? ` · ${kb} KB` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${etiqueta.clases}`}
                >
                  {etiqueta.texto}
                </span>
                <Link
                  href={`/documentos/${doc.id}`}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Ver
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          Aún no has subido ningún documento.
        </p>
      )}
    </div>
  );
}
