import Link from "next/link";
import { redirect } from "next/navigation";

import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { crearClienteServidor } from "@/lib/supabase/servidor";

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
  const perfilesById: Record<
    string,
    { nombre_completo: string | null; nombre_usuario: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, nombre_completo, nombre_usuario")
      .in("id", userIds);
    for (const p of perfiles ?? []) perfilesById[p.id] = p;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— acceso compartido</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          Compartidos <em className="italic text-accent">conmigo</em>
        </h1>
        <p className="text-mute text-[13px] mt-1">
          {documentos.length} documento{documentos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {documentos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display italic text-accent text-lg mb-1">Sin documentos</p>
          <p className="text-mute text-sm">Nadie ha compartido documentos contigo todavía.</p>
        </div>
      ) : (
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {documentos.map((doc) => {
            const perfil = perfilesById[doc.user_id];
            const autor = perfil?.nombre_completo || perfil?.nombre_usuario || "—";
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = (doc.confidencialidad ?? 1) === 0;
            return (
              <div
                key={doc.id}
                className="grid grid-cols-[44px_1fr_120px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
              >
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/documentos/${doc.id}`}
                    className="font-medium hover:text-accent transition-colors truncate block"
                  >
                    {doc.nombre}
                  </Link>
                  <p className="text-mute text-[11px] font-mono mt-0.5">
                    {autor} · {fecha}{kb ? ` · ${kb} KB` : ""}
                  </p>
                </div>
                <Tag variant={esPublico ? "pub" : "priv"}>
                  {esPublico ? "público" : "privado"}
                </Tag>
                <a href={`/api/documentos/${doc.id}/url`}>
                  <Button variant="ghost" size="sm">Descargar</Button>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
