import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import FormularioInvitacion from "./FormularioInvitacion";
import { quitarPermiso } from "./acciones";
import AccionesClasificacion from "./AccionesClasificacion";

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

  const esPublico = doc.confidencialidad === 0;
  const tipo = (doc.tipo_archivo ?? "").toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link href="/mis-documentos" className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1">
        ‹ Mis documentos
      </Link>

      {/* Cabecera */}
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— tu archivo personal</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em] break-words leading-tight">
          {doc.nombre}
        </h1>
        <p className="text-mute text-[12px] font-mono mt-1.5">
          {tipo || "—"} · {fecha}{kb ? ` · ${kb} KB` : ""}
        </p>
      </div>

      {/* Bloque clasificación + acciones */}
      <div className="rounded-[14px] border border-rule bg-paper p-5 flex flex-col sm:flex-row sm:items-start gap-5">
        {/* Clasificación */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tag variant={esPublico ? "pub" : "priv"}>
              {esPublico ? "Público" : "Privado"}
            </Tag>
          </div>
          {doc.probabilidad !== null && (
            <div className="flex flex-col gap-1">
              <p className="text-mute text-[11px]">
                Confianza del modelo: {Math.round(doc.probabilidad * 100)} %
              </p>
              <div className="h-1 bg-rule rounded-full overflow-hidden w-48">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${Math.round(doc.probabilidad * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 sm:items-end">
          <a href={`/api/documentos/${id}/url`}>
            <Button variant="primary" size="md">
              Descargar
            </Button>
          </a>
          {esPropietario && (
            <AccionesClasificacion
              docId={id}
              nombre={doc.nombre}
              tipo={doc.tipo_archivo ?? ""}
              esPublico={esPublico}
            />
          )}
        </div>
      </div>

      {/* Permisos (solo propietario) */}
      {esPropietario && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
            Permisos de <em className="italic text-accent">acceso</em>
          </h2>

          <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            {permisos.length === 0 ? (
              <p className="px-5 py-6 text-mute text-sm text-center">
                Nadie tiene acceso explícito todavía.
              </p>
            ) : (
              permisos.map((p) => {
                const perfil = perfilesById[p.inv_user_id];
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0"
                  >
                    <Avatar
                      nombreCompleto={perfil?.nombre_completo ?? null}
                      nombreUsuario={perfil?.nombre_usuario ?? ""}
                      avatarUrl={null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">
                        {perfil?.nombre_completo || perfil?.nombre_usuario || "—"}
                      </p>
                      {perfil?.nombre_usuario && (
                        <p className="text-mute text-[11px] font-mono">
                          @{perfil.nombre_usuario}
                        </p>
                      )}
                    </div>
                    <form action={quitarPermiso.bind(null, id, p.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Revocar
                      </Button>
                    </form>
                  </div>
                );
              })
            )}
          </div>

          <FormularioInvitacion documentoId={id} />
        </section>
      )}
    </div>
  );
}
