import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  desvincularDocumento,
  expulsarMiembro,
  vincularDocumento,
} from "../acciones";
import FormularioMiembro from "./FormularioMiembro";

export default async function PaginaOrganizacion({
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

  // Verificar membresía
  const { data: miMembresia } = await supabase
    .from("org_miembros")
    .select("rol")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .single();

  if (!miMembresia) redirect("/organizaciones");

  const esAdmin = miMembresia.rol === "admin";

  const { data: org } = await supabase
    .from("organizaciones")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!org) redirect("/organizaciones");

  // Miembros de la org
  const { data: miembros } = await supabase
    .from("org_miembros")
    .select("user_id, rol, profiles ( nombre_completo, nombre_usuario )")
    .eq("org_id", id);

  // Documentos vinculados a la org
  const { data: orgDocs } = await supabase
    .from("org_documentos")
    .select("documento_id, Documentos ( id, nombre, tipo_archivo )")
    .eq("org_id", id);

  // Mis documentos no vinculados a esta org (para poder añadirlos)
  const vinculadosIds = new Set(orgDocs?.map((od) => od.documento_id) ?? []);
  const { data: misDocumentos } = await supabase
    .from("Documentos")
    .select("id, nombre, tipo_archivo")
    .eq("user_id", user.id)
    .order("nombre");

  const docsSinVincular = misDocumentos?.filter((d) => !vinculadosIds.has(d.id)) ?? [];

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <h1 className="text-2xl font-bold">{org.nombre}</h1>

      {/* Miembros */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Miembros</h2>
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {miembros?.map((m) => {
            const perfil = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            const esYo = m.user_id === user.id;
            return (
              <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{perfil?.nombre_completo || perfil?.nombre_usuario || "—"}</p>
                  <p className="text-xs text-gray-400 capitalize">{m.rol}{esYo ? " (tú)" : ""}</p>
                </div>
                {esAdmin && !esYo && (
                  <form action={expulsarMiembro.bind(null, id, m.user_id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Expulsar
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {esAdmin && <FormularioMiembro orgId={id} />}
      </section>

      {/* Documentos vinculados */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Documentos de la organización</h2>
        {orgDocs && orgDocs.length > 0 ? (
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {orgDocs.map((od) => {
              const doc = Array.isArray(od.Documentos) ? od.Documentos[0] : od.Documentos;
              if (!doc) return null;
              return (
                <li key={od.documento_id} className="flex items-center gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 truncate font-medium">{doc.nombre}</p>
                  {esAdmin && (
                    <form action={desvincularDocumento.bind(null, id, od.documento_id)}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Desvincular
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No hay documentos vinculados.</p>
        )}

        {esAdmin && docsSinVincular.length > 0 && (
          <details className="rounded-xl border border-gray-200 dark:border-gray-800">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Añadir mis documentos ({docsSinVincular.length})
            </summary>
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {docsSinVincular.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm">{doc.nombre}</p>
                  <form action={vincularDocumento.bind(null, id, doc.id)}>
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Vincular
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
