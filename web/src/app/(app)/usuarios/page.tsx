import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { alternarBloqueo, alternarFavorito } from "./acciones";

export default async function PaginaUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string }>;
}) {
  const { buscar } = await searchParams;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Estado actual: mis favoritos y bloqueos
  const [{ data: misFavoritos }, { data: misBloqueos }] = await Promise.all([
    supabase.from("favoritos").select("favorito_id").eq("propietario_id", user.id),
    supabase.from("bloqueos").select("bloqueado_id").eq("bloqueador_id", user.id),
  ]);
  const favoritosIds = new Set(misFavoritos?.map((f) => f.favorito_id) ?? []);
  const bloqueadosIds = new Set(misBloqueos?.map((b) => b.bloqueado_id) ?? []);

  // Búsqueda de usuarios
  let resultados: { id: string; nombre_usuario: string; nombre_completo: string | null }[] = [];
  if (buscar && buscar.trim().length >= 2) {
    const termino = buscar.trim();
    const { data } = await supabase
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo")
      .or(`nombre_usuario.ilike.%${termino}%,nombre_completo.ilike.%${termino}%`)
      .neq("id", user.id)
      .limit(20);
    resultados = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>

      {/* Buscador */}
      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="buscar"
          defaultValue={buscar ?? ""}
          placeholder="Buscar por nombre o usuario…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Buscar
        </button>
      </form>

      {/* Resultados */}
      {buscar && buscar.trim().length >= 2 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Resultados ({resultados.length})
          </h2>
          {resultados.length > 0 ? (
            <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {resultados.map((u) => {
                const esFavorito = favoritosIds.has(u.id);
                const estaBloqueado = bloqueadosIds.has(u.id);
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{u.nombre_completo || u.nombre_usuario}</p>
                      <p className="text-xs text-gray-400">@{u.nombre_usuario}</p>
                    </div>
                    <form action={alternarFavorito.bind(null, u.id)}>
                      <button
                        type="submit"
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          esFavorito
                            ? "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                            : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        }`}
                      >
                        {esFavorito ? "Quitar favorito" : "Favorito"}
                      </button>
                    </form>
                    <form action={alternarBloqueo.bind(null, u.id)}>
                      <button
                        type="submit"
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          estaBloqueado
                            ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-300"
                            : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        }`}
                      >
                        {estaBloqueado ? "Desbloquear" : "Bloquear"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No se encontraron usuarios.</p>
          )}
        </section>
      )}

      {/* Mis favoritos */}
      {favoritosIds.size > 0 && (
        <FavoritosActuales ids={[...favoritosIds]} />
      )}
    </div>
  );
}

// Componente auxiliar para mostrar favoritos actuales en el mismo Server Component
async function FavoritosActuales({ ids }: { ids: string[] }) {
  const supabase = await (await import("@/lib/supabase/servidor")).crearClienteServidor();
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo")
    .in("id", ids);

  if (!perfiles?.length) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Mis favoritos
      </h2>
      <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {perfiles.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{u.nombre_completo || u.nombre_usuario}</p>
              <p className="text-xs text-gray-400">@{u.nombre_usuario}</p>
            </div>
            <form action={alternarFavorito.bind(null, u.id)}>
              <button
                type="submit"
                className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
              >
                Quitar favorito
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
