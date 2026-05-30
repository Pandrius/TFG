import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  desvincularDocumento,
  expulsarMiembro,
  vincularDocumento,
} from "../acciones";
import FormularioMiembro from "./FormularioMiembro";
import ResumenMiembros, { type MiembroResumen } from "./ResumenMiembros";
import { FormularioInlineCarpeta } from "../../carpetas/FormularioInlineCarpeta";

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

  const admin = crearClienteAdmin();

  // Verificar membresía usando admin para evitar fallos de RLS en el check
  const { data: miMembresia } = await admin
    .from("org_miembros")
    .select("rol")
    .eq("org_id", id)
    .eq("user_id", user.id)
    .single();

  if (!miMembresia) redirect("/organizaciones");

  const esAdmin = miMembresia.rol === "admin";

  const { data: org } = await admin
    .from("organizaciones")
    .select("id, nombre")
    .eq("id", id)
    .single();

  if (!org) redirect("/organizaciones");

  // Miembros de la org
  const { data: miembros } = await admin
    .from("org_miembros")
    .select("user_id, rol")
    .eq("org_id", id);

  const miembroIds = new Set(miembros?.map((m) => m.user_id) ?? []);
  const { data: invitacionesPendientes } = await admin
    .from("org_invitaciones")
    .select("invitado_id")
    .eq("org_id", id)
    .eq("estado", "pendiente");

  const invitadosPendientesIds = new Set(
    invitacionesPendientes?.map((invitacion) => invitacion.invitado_id) ?? [],
  );
  const { data: perfiles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo")
    .order("nombre_usuario");

  const usuariosDisponibles =
    perfiles?.filter(
      (perfil) => !miembroIds.has(perfil.id) && !invitadosPendientesIds.has(perfil.id),
    ) ?? [];
  const perfilesPorId = new Map((perfiles ?? []).map((perfil) => [perfil.id, perfil]));

  // Carpetas de la org
  const { data: carpetas } = await admin
    .from("carpetas")
    .select("id, nombre")
    .eq("org_id", id)
    .order("nombre");

  // Documentos vinculados a la org
  const { data: orgDocs } = await admin
    .from("org_documentos")
    .select("documento_id, Documentos ( id, nombre, tipo_archivo, carpeta_id )")
    .eq("org_id", id);

  const totalCarpetas = carpetas?.length ?? 0;
  const [{ count: totalMiembros }, { count: totalDocumentos }] = await Promise.all([
    admin
      .from("org_miembros")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", id),
    admin
      .from("org_documentos")
      .select("documento_id", { count: "exact", head: true })
      .eq("org_id", id),
  ]);

  // Mis documentos no vinculados a esta org (para poder añadirlos)
  const vinculadosIds = new Set(orgDocs?.map((od) => od.documento_id) ?? []);
  const { data: misDocumentos } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo")
    .eq("user_id", user.id)
    .order("nombre");

  const docsSinVincular = misDocumentos?.filter((d) => !vinculadosIds.has(d.id)) ?? [];
  const miembrosResumen: MiembroResumen[] =
    miembros?.map((m) => {
      const perfil = perfilesPorId.get(m.user_id);
      return {
        user_id: m.user_id,
        rol: m.rol,
        nombre_completo: perfil?.nombre_completo ?? null,
        nombre_usuario: perfil?.nombre_usuario ?? null,
      };
    }) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <Link
        href="/organizaciones"
        className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1"
      >
        ‹ Organizaciones
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">— equipo</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
            {org.nombre}
          </h1>
          <ResumenMiembros
            orgId={id}
            miembros={miembrosResumen}
            userId={user.id}
            esAdmin={esAdmin}
            totalMiembros={totalMiembros ?? 0}
            totalDocumentos={totalDocumentos ?? 0}
            totalCarpetas={totalCarpetas}
          />
        </div>
      </div>

      {/* Miembros */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-medium text-[18px] tracking-[-0.01em]">
          Miembros
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {miembros?.map((m) => {
            const perfil = perfilesPorId.get(m.user_id);
            const esYo = m.user_id === user.id;
            const nombreCompleto = perfil?.nombre_completo ?? null;
            const nombreUsuario = perfil?.nombre_usuario ?? null;
            return (
              <div
                key={m.user_id}
                className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0 text-[13px]"
              >
                <Avatar
                  nombreCompleto={nombreCompleto ?? undefined}
                  nombreUsuario={nombreUsuario ?? undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {nombreCompleto || nombreUsuario || "—"}
                    {esYo && (
                      <span className="text-mute font-normal text-[12px] ml-1">(tú)</span>
                    )}
                  </p>
                  {nombreUsuario && (
                    <p className="text-mute text-[11px] font-mono">@{nombreUsuario}</p>
                  )}
                </div>
                <span className="text-mute text-[12px] capitalize font-mono px-2 py-0.5 bg-soft rounded-full">
                  {m.rol}
                </span>
                {esAdmin && !esYo && (
                  <form
                    action={async () => {
                      "use server";
                      await expulsarMiembro(id, m.user_id);
                    }}
                  >
                    <Button type="submit" variant="danger" size="sm">
                      Revocar
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {esAdmin && <FormularioMiembro orgId={id} usuarios={usuariosDisponibles} />}
      </section>

      {/* Carpetas */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-[18px] tracking-[-0.01em]">
            Carpetas del equipo
          </h2>
          <FormularioInlineCarpeta orgId={id} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {carpetas?.map((c) => (
            <Link
              key={c.id}
              href={`/carpetas/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-paper border border-rule rounded-[12px] hover:border-accent transition-colors"
            >
              <span className="w-8 h-8 rounded-[8px] bg-accent-tint text-accent grid place-items-center font-display italic font-bold">
                C
              </span>
              <span className="font-medium text-[13px] truncate">{c.nombre}</span>
            </Link>
          ))}
          {(!carpetas || carpetas.length === 0) && (
            <p className="col-span-full text-mute text-sm italic py-4">No hay carpetas creadas.</p>
          )}
        </div>
      </section>

      {/* Documentos vinculados */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display font-medium text-[18px] tracking-[-0.01em]">
          Documentos compartidos
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {!orgDocs || orgDocs.length === 0 ? (
            <div className="px-5 py-8 text-center text-mute text-sm">
              No hay documentos vinculados.
            </div>
          ) : (
            orgDocs.map((od) => {
              const doc = Array.isArray(od.Documentos) ? od.Documentos[0] : od.Documentos;
              if (!doc) return null;
              const tipo = (doc.tipo_archivo ?? "").toUpperCase();
              return (
                <div
                  key={od.documento_id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0 text-[13px]"
                >
                  <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px] shrink-0">
                    {tipo.slice(0, 3) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.nombre}</p>
                    {doc.carpeta_id && (
                      <p className="text-mute text-[10px] font-mono">
                        en carpeta: {carpetas?.find(c => c.id === doc.carpeta_id)?.nombre || "..."}
                      </p>
                    )}
                  </div>
                  {esAdmin && (
                    <form
                      action={async () => {
                        "use server";
                        await desvincularDocumento(id, od.documento_id);
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        Desvincular
                      </Button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>

        {esAdmin && docsSinVincular.length > 0 && (
          <details className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            <summary className="cursor-pointer px-5 py-3 text-[13px] font-medium hover:bg-soft transition-colors">
              Vincular mis documentos ({docsSinVincular.length})
            </summary>
            <div className="border-t border-rule">
              {docsSinVincular.map((doc) => {
                const tipo = (doc.tipo_archivo ?? "").toUpperCase();
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0 text-[13px]"
                  >
                    <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px] shrink-0">
                      {tipo.slice(0, 3) || "?"}
                    </span>
                    <p className="min-w-0 flex-1 truncate">{doc.nombre}</p>
                    <form
                      action={async () => {
                        "use server";
                        await vincularDocumento(id, doc.id);
                      }}
                    >
                      <Button type="submit" variant="primary" size="sm">
                        Vincular
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
