import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioCarpeta from "./FormularioCarpeta";
import { eliminarCarpeta } from "./acciones";

export default async function PaginaCarpetas() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: carpetas } = await supabase
    .from("carpetas")
    .select("id, nombre")
    .eq("user_id", user.id)
    .order("nombre");

  // Contar documentos por carpeta
  const { data: conteos } = await supabase
    .from("Documentos")
    .select("carpeta_id")
    .eq("user_id", user.id)
    .not("carpeta_id", "is", null);

  const conteosPorCarpeta: Record<string, number> = {};
  for (const d of conteos ?? []) {
    if (d.carpeta_id) {
      conteosPorCarpeta[d.carpeta_id] = (conteosPorCarpeta[d.carpeta_id] ?? 0) + 1;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Carpetas</h1>
        <p className="mt-1 text-sm text-gray-500">
          {carpetas?.length ?? 0} carpeta{carpetas?.length !== 1 ? "s" : ""}
        </p>
      </div>

      <FormularioCarpeta />

      {carpetas && carpetas.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {carpetas.map((c) => {
            const ndocs = conteosPorCarpeta[c.id] ?? 0;
            return (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/carpetas/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.nombre}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {ndocs} documento{ndocs !== 1 ? "s" : ""}
                  </p>
                </div>
                <form action={eliminarCarpeta.bind(null, c.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          No tienes carpetas todavía. Crea una para organizar tus documentos.
        </p>
      )}
    </div>
  );
}
