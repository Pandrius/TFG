import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { alternarBloqueo, alternarFavorito } from "./acciones";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">

      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— comunidad</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          <em className="italic text-accent">Usuarios</em>
        </h1>
      </div>

      {/* Buscador */}
      <form method="GET" className="flex gap-2">
        <Input type="search" name="buscar" defaultValue={buscar ?? ""} placeholder="Buscar por nombre o @usuario…" className="flex-1" />
        <Button type="submit" variant="primary" size="md">Buscar</Button>
        {buscar && <a href="/usuarios"><Button type="button" variant="ghost" size="md">Limpiar</Button></a>}
      </form>

      {/* Resultados de búsqueda */}
      {buscar && buscar.trim().length >= 2 && (
        <section className="flex flex-col gap-3">
          <p className="text-mute text-[12px] font-mono">Resultados ({resultados.length})</p>
          {resultados.length > 0 ? (
            <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
              {resultados.map((u) => {
                const esFavorito = favoritosIds.has(u.id);
                const estaBloqueado = bloqueadosIds.has(u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0">
                    <Avatar nombreCompleto={u.nombre_completo} nombreUsuario={u.nombre_usuario} avatarUrl={null} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">{u.nombre_completo || u.nombre_usuario}</p>
                      <p className="text-mute text-[11px] font-mono">@{u.nombre_usuario}</p>
                    </div>
                    <form action={alternarFavorito.bind(null, u.id)}>
                      <Button type="submit" variant="ghost" size="sm" className={esFavorito ? "text-accent bg-accent-tint border-accent-soft" : ""}>
                        {esFavorito ? "Quitar favorito" : "Favorito"}
                      </Button>
                    </form>
                    <form action={alternarBloqueo.bind(null, u.id)}>
                      <Button type="submit" variant="ghost" size="sm" className={estaBloqueado ? "text-danger bg-danger-tint border-danger-soft" : ""}>
                        {estaBloqueado ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-mute text-sm">No se encontraron usuarios.</p>
          )}
        </section>
      )}

      {/* Mis favoritos */}
      {favoritosIds.size > 0 && <FavoritosActuales ids={[...favoritosIds]} />}
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
    <section className="flex flex-col gap-3">
      <p className="text-mute text-[12px] font-mono uppercase tracking-wider">Mis favoritos</p>
      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        {perfiles.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0">
            <Avatar nombreCompleto={u.nombre_completo} nombreUsuario={u.nombre_usuario} avatarUrl={null} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px]">{u.nombre_completo || u.nombre_usuario}</p>
              <p className="text-mute text-[11px] font-mono">@{u.nombre_usuario}</p>
            </div>
            <form action={alternarFavorito.bind(null, u.id)}>
              <Button type="submit" variant="ghost" size="sm" className="text-accent bg-accent-tint border-accent-soft">
                Quitar favorito
              </Button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
