import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

const ETIQUETA_TIPO: Record<string, string> = {
  pdf: "PDF", docx: "DOC", xlsx: "XLS", csv: "CSV", pptx: "PPT", txt: "TXT",
};
const ETIQUETA: Record<number, { texto: string; clases: string }> = {
  0: { texto: "Público", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  1: { texto: "Confidencial", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export default async function PaginaCompartidos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Documentos donde tengo permiso explícito
  const { data: permisosData } = await supabase
    .from("Permisos")
    .select("documento_id")
    .eq("inv_user_id", user.id);
  const idsConPermiso = permisosData?.map((p) => p.documento_id) ?? [];

  // Propietarios que me tienen como favorito → accedo a todos sus documentos
  const { data: favoritosData } = await supabase
    .from("favoritos")
    .select("propietario_id")
    .eq("favorito_id", user.id);
  const propietariosQueMeFavorecen =
    favoritosData?.map((f) => f.propietario_id) ?? [];

  let documentos: {
    id: string;
    nombre: string;
    tipo_archivo: string | null;
    confidencialidad: number | null;
    tamano_bytes: number | null;
    fecha: string;
    user_id: string;
  }[] = [];

  if (idsConPermiso.length > 0 || propietariosQueMeFavorecen.length > 0) {
    const filtros: string[] = [];
    if (idsConPermiso.length > 0)
      filtros.push(`id.in.(${idsConPermiso.join(",")})`);
    if (propietariosQueMeFavorecen.length > 0)
      filtros.push(`user_id.in.(${propietariosQueMeFavorecen.join(",")})`);

    const { data } = await supabase
      .from("Documentos")
      .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id")
      .neq("user_id", user.id)
      .or(filtros.join(","))
      .order("fecha", { ascending: false });

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
        <h1 className="text-2xl font-bold">Compartidos conmigo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Documentos a los que tienes acceso por permiso o favorito
        </p>
      </div>

      {documentos.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = perfil?.nombre_completo || perfil?.nombre_usuario || "—";
            const etiqueta = ETIQUETA[doc.confidencialidad ?? 1] ?? ETIQUETA[1];
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipoLabel = ETIQUETA_TIPO[doc.tipo_archivo ?? ""] ?? doc.tipo_archivo ?? "—";

            return (
              <li key={doc.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                  {tipoLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${etiqueta.clases}`}>
                  {etiqueta.texto}
                </span>
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
          Nadie ha compartido documentos contigo todavía.
        </p>
      )}
    </div>
  );
}
