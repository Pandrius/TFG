import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import FormularioInvitacion, { type UsuarioInvitable } from "./FormularioInvitacion";
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
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id, probabilidad, url")
    .eq("id", id)
    .single();

  const [{ data: permisoActual }, { data: favoritoActual }] = doc
    ? await Promise.all([
        admin
          .from("Permisos")
          .select("id")
          .eq("documento_id", id)
          .eq("inv_user_id", user.id)
          .maybeSingle(),
        admin
          .from("favoritos")
          .select("propietario_id")
          .eq("propietario_id", doc.user_id)
          .eq("favorito_id", user.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  // Verificar acceso: propietario, publico, permiso explicito o favorito del propietario.
  const tieneAcceso =
    doc &&
    (doc.user_id === user.id ||
      doc.confidencialidad === 0 ||
      !!permisoActual ||
      !!favoritoActual);
  if (!tieneAcceso) redirect("/mis-documentos");

  const esPropietario = doc.user_id === user.id;
  const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
  const fecha = new Date(doc.fecha).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Permisos actuales (solo para el propietario)
  let permisos: { id: string; inv_user_id: string }[] = [];
  const perfilesById: Record<
    string,
    { nombre_usuario: string; nombre_completo: string | null; avatar_url: string | null }
  > = {};
  let usuariosInvitables: UsuarioInvitable[] = [];

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
        .select("id, nombre_usuario, nombre_completo, avatar_url")
        .in("id", invitadoIds);
      for (const p of perfilesData ?? []) perfilesById[p.id] = p;
    }

    const excluidos = new Set([user.id, ...invitadoIds]);
    const { data: perfilesDisponibles } = await admin
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo, avatar_url")
      .order("nombre_usuario");
    usuariosInvitables =
      perfilesDisponibles?.filter((perfil) => !excluidos.has(perfil.id)) ?? [];
  }

  const esPublico = doc.confidencialidad === 0;
  const tipo = (doc.tipo_archivo ?? "").toUpperCase();
  const { count: descargas } = await admin
    .from("descargas_documentos")
    .select("id", { count: "exact", head: true })
    .eq("documento_id", id);
  const { data: previewUrlData } = await admin.storage
    .from("almacen_documentos")
    .createSignedUrl(doc.url, 300);
  const previewUrl = previewUrlData?.signedUrl ?? null;
  const textoPreview = previewUrl
    ? await obtenerTextoPreview(previewUrl, tipo, doc.tamano_bytes)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
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
          <span className="text-mute text-[11px] font-mono">
            {descargas ?? 0} desc.
          </span>
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

      <VistaPreviaDocumento
        nombre={doc.nombre}
        tipo={tipo}
        fecha={fecha}
        kb={kb}
        esPublico={esPublico}
        previewUrl={previewUrl}
        textoPreview={textoPreview}
        descargaHref={`/api/documentos/${id}/url`}
      />

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
                      avatarUrl={perfil?.avatar_url ?? null}
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

          <FormularioInvitacion documentoId={id} usuarios={usuariosInvitables} />
        </section>
      )}
    </div>
  );
}

function VistaPreviaDocumento({
  nombre,
  tipo,
  fecha,
  kb,
  esPublico,
  previewUrl,
  textoPreview,
  descargaHref,
}: {
  nombre: string;
  tipo: string;
  fecha: string;
  kb: number | null;
  esPublico: boolean;
  previewUrl: string | null;
  textoPreview: string | null;
  descargaHref: string;
}) {
  const tipoNormalizado = tipo.toLowerCase();
  const esPdf = tipoNormalizado === "pdf";
  const esImagen = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(tipoNormalizado);

  return (
    <section className="rounded-[14px] border border-rule bg-paper overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-rule">
        <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
          Vista <em className="italic text-accent">previa</em>
        </h2>
        <a href={descargaHref}>
          <Button variant="ghost" size="sm">Descargar</Button>
        </a>
      </div>

      {!previewUrl ? (
        <MarkdownFallback
          nombre={nombre}
          tipo={tipo}
          fecha={fecha}
          kb={kb}
          esPublico={esPublico}
        />
      ) : esPdf ? (
        <iframe
          src={previewUrl}
          title={`Vista previa de ${nombre}`}
          className="w-full h-[72vh] min-h-[520px] bg-card"
        />
      ) : esImagen ? (
        <div className="bg-card p-4 grid place-items-center min-h-[360px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={nombre}
            className="max-h-[72vh] max-w-full rounded-[8px] border border-rule object-contain"
          />
        </div>
      ) : textoPreview ? (
        <pre className="bg-card p-5 overflow-auto max-h-[72vh] text-[13px] leading-6 whitespace-pre-wrap font-mono">
          {textoPreview}
        </pre>
      ) : (
        <MarkdownFallback
          nombre={nombre}
          tipo={tipo}
          fecha={fecha}
          kb={kb}
          esPublico={esPublico}
        />
      )}
    </section>
  );
}

function MarkdownFallback({
  nombre,
  tipo,
  fecha,
  kb,
  esPublico,
}: {
  nombre: string;
  tipo: string;
  fecha: string;
  kb: number | null;
  esPublico: boolean;
}) {
  return (
    <div className="bg-card p-5">
      <div className="rounded-[10px] border border-rule bg-paper p-5 font-mono text-[13px] leading-6 text-ink-soft">
        <p className="font-semibold text-ink"># {nombre}</p>
        <p>- Tipo: {tipo || "sin extension"}</p>
        <p>- Fecha: {fecha}</p>
        <p>- Tamano: {kb !== null ? `${kb} KB` : "no disponible"}</p>
        <p>- Visibilidad: {esPublico ? "publico" : "privado"}</p>
        <p className="mt-4 text-mute">
          Este formato no se puede previsualizar directamente en el navegador.
          Usa Descargar para abrir el archivo original.
        </p>
      </div>
    </div>
  );
}

async function obtenerTextoPreview(
  url: string,
  tipo: string,
  tamanoBytes: number | null,
) {
  const tipoNormalizado = tipo.toLowerCase();
  const esTexto = ["txt", "md", "markdown", "csv", "json", "log"].includes(tipoNormalizado);
  if (!esTexto) return null;
  if (tamanoBytes && tamanoBytes > 1024 * 1024) return null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const texto = await res.text();
    return texto.length > 50000 ? `${texto.slice(0, 50000)}\n\n...` : texto;
  } catch {
    return null;
  }
}
