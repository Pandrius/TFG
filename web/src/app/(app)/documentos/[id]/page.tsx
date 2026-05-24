import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioInvitacion from "./FormularioInvitacion";
import { quitarPermiso } from "./acciones";

export default async function PaginaDocumento({
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

  const admin = crearClienteAdmin();
  const { data: doc } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id, probabilidad")
    .eq("id", id)
    .single();

  // Verificar acceso: propietario o documento público.
  const tieneAcceso = doc && (doc.user_id === user.id || doc.confidencialidad === 0);
  if (!tieneAcceso) redirect("/mis-documentos");

  const esPropietario = doc.user_id === user.id;
  const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
  const fecha = new Date(doc.fecha).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Permisos actuales (solo para el propietario)
  let permisos: { id: string; inv_user_id: string }[] = [];
  const perfilesById: Record<string, { nombre_usuario: string; nombre_completo: string | null }> = {};

  if (esPropietario) {
    const { data: permisosData } = await admin
      .from("Permisos")
      .select("id, inv_user_id")
      .eq("documento_id", id);

    permisos = permisosData ?? [];

    const invitadoIds = permisos.map((p) => p.inv_user_id);
    if (invitadoIds.length > 0) {
      const { data: perfilesData } = await admin
        .from("profiles")
        .select("id, nombre_usuario, nombre_completo")
        .in("id", invitadoIds);
      for (const p of perfilesData ?? []) perfilesById[p.id] = p;
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold break-words">{doc.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {doc.tipo_archivo?.toUpperCase()} · {fecha}{kb ? ` · ${kb} KB` : ""}
        </p>
      </div>

      {/* Clasificación */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            doc.confidencialidad === 0
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {doc.confidencialidad === 0 ? "Público" : "Confidencial"}
        </span>
        {doc.probabilidad !== null && (
          <span className="text-sm text-gray-400">
            Confianza: {Math.round(doc.probabilidad * 100)} %
          </span>
        )}
        <a
          href={`/api/documentos/${id}/url`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Descargar
        </a>
      </div>

      {/* Gestión de permisos (solo propietario) */}
      {esPropietario && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Permisos de acceso</h2>

          {permisos.length > 0 ? (
            <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {permisos.map((p) => {
                const perfil = perfilesById[p.inv_user_id];
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{perfil?.nombre_completo || perfil?.nombre_usuario || "—"}</p>
                      {perfil?.nombre_usuario && (
                        <p className="text-xs text-gray-400">@{perfil.nombre_usuario}</p>
                      )}
                    </div>
                    <form action={quitarPermiso.bind(null, id, p.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Revocar
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nadie tiene acceso explícito todavía.</p>
          )}

          <FormularioInvitacion documentoId={id} />
        </section>
      )}
    </div>
  );
}
