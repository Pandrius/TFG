import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioOrg from "./FormularioOrg";

export default async function PaginaOrganizaciones() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: misOrgs } = await supabase
    .from("org_miembros")
    .select("rol, organizaciones ( id, nombre )")
    .eq("user_id", user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Organizaciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          {misOrgs?.length ?? 0} organización{misOrgs?.length !== 1 ? "es" : ""}
        </p>
      </div>

      <FormularioOrg />

      {misOrgs && misOrgs.length > 0 ? (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {misOrgs.map((m) => {
            const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
            if (!org) return null;
            return (
              <li key={org.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/organizaciones/${org.id}`} className="font-medium hover:underline">
                    {org.nombre}
                  </Link>
                  <p className="text-xs text-gray-400 capitalize">{m.rol}</p>
                </div>
                <Link
                  href={`/organizaciones/${org.id}`}
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
          No perteneces a ninguna organización todavía.
        </p>
      )}
    </div>
  );
}
