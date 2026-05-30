import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FiabilidadModelo } from "@/components/ui/FiabilidadModelo";
import { Tag } from "@/components/ui/Tag";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type PermisoCompartido = {
  documento_id: string;
  sender_id: string | null;
};

type DocumentoCompartido = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  user_id: string;
  probabilidad: number | null;
};

type Perfil = {
  nombre_completo: string | null;
  nombre_usuario: string;
  avatar_url: string | null;
};

type EntradaCompartida = {
  doc: DocumentoCompartido;
  remitenteId: string;
};

export default async function PaginaCompartidos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  const { data: permisosData, error: permisosConRemitenteError } = await admin
    .from("Permisos")
    .select("documento_id, sender_id")
    .eq("inv_user_id", user.id);
  let permisos: PermisoCompartido[] = permisosData ?? [];

  if (permisosConRemitenteError) {
    const { data: permisosSinRemitente } = await admin
      .from("Permisos")
      .select("documento_id")
      .eq("inv_user_id", user.id);
    permisos =
      permisosSinRemitente?.map((permiso) => ({
        documento_id: permiso.documento_id,
        sender_id: null,
      })) ?? [];
  }

  const idsConPermiso = permisos.map((p) => p.documento_id);

  let documentos: DocumentoCompartido[] = [];
  if (idsConPermiso.length > 0) {
    const { data } = await admin
      .from("Documentos")
      .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, user_id, probabilidad")
      .neq("user_id", user.id)
      .in("id", idsConPermiso)
      .order("fecha", { ascending: false });

    documentos = data ?? [];
  }

  const documentosPorId = new Map(documentos.map((doc) => [doc.id, doc]));
  const entradas: EntradaCompartida[] = [];

  for (const permiso of permisos) {
    const doc = documentosPorId.get(permiso.documento_id);
    if (!doc) continue;
    entradas.push({
      doc,
      remitenteId: permiso.sender_id ?? doc.user_id,
    });
  }

  const docIds = entradas.map((entrada) => entrada.doc.id);
  const descargasPorDoc = docIds.length > 0
    ? contarDescargas(
        (await admin
          .from("descargas_documentos")
          .select("documento_id")
          .in("documento_id", docIds)).data ?? [],
      )
    : new Map<string, number>();

  const profileIds = [
    ...new Set(entradas.flatMap((entrada) => [entrada.remitenteId, entrada.doc.user_id])),
  ];
  const perfilesById: Record<string, Perfil> = {};
  if (profileIds.length > 0) {
    const { data: perfiles } = await admin
      .from("profiles")
      .select("id, nombre_completo, nombre_usuario, avatar_url")
      .in("id", profileIds);
    for (const perfil of perfiles ?? []) perfilesById[perfil.id] = perfil;
  }

  const grupos = agruparPorRemitente(entradas);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <p className="font-display italic text-accent text-sm mb-1">- acceso compartido</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          Compartidos <em className="italic text-accent">conmigo</em>
        </h1>
        <p className="text-mute text-[13px] mt-1">
          {entradas.length} documento{entradas.length !== 1 ? "s" : ""} de{" "}
          {grupos.length} remitente{grupos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {entradas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display italic text-accent text-lg mb-1">Sin documentos</p>
          <p className="text-mute text-sm">Nadie ha enviado documentos para ti todavia.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map(({ remitenteId, entradas: documentosGrupo }) => {
            const remitente = perfilesById[remitenteId];
            const nombreRemitente =
              remitente?.nombre_completo || remitente?.nombre_usuario || "Usuario";

            return (
              <section
                key={remitenteId}
                className="rounded-[14px] border border-rule bg-paper overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-4 bg-soft border-b border-rule">
                  <Avatar
                    nombreCompleto={remitente?.nombre_completo ?? null}
                    nombreUsuario={remitente?.nombre_usuario ?? nombreRemitente}
                    avatarUrl={remitente?.avatar_url ?? null}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h2 className="font-display font-medium text-lg tracking-[-0.01em] truncate">
                      {nombreRemitente}
                    </h2>
                    <p className="text-mute text-[11px] font-mono">
                      {documentosGrupo.length} documento
                      {documentosGrupo.length !== 1 ? "s" : ""} enviado
                      {documentosGrupo.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {documentosGrupo.map(({ doc }) => {
                  const propietario = perfilesById[doc.user_id];
                  const autor =
                    propietario?.nombre_completo || propietario?.nombre_usuario || "Autor";
                  const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
                  const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
                  const tipo = (doc.tipo_archivo ?? "").toUpperCase();
                  const esPublico = (doc.confidencialidad ?? 1) === 0;
                  const descargas = descargasPorDoc.get(doc.id) ?? 0;

                  return (
                    <div
                      key={`${remitenteId}-${doc.id}`}
                      className="grid grid-cols-[44px_1fr_130px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
                    >
                      <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                        {tipo.slice(0, 3) || "?"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={`/documentos/${doc.id}`}
                            className="min-w-0 font-medium hover:text-accent transition-colors truncate block"
                          >
                            {doc.nombre}
                          </Link>
                          <FiabilidadModelo
                            probabilidad={doc.probabilidad}
                            tipoArchivo={doc.tipo_archivo}
                            confidencialidad={doc.confidencialidad}
                          />
                        </div>
                        <p className="text-mute text-[11px] font-mono mt-0.5">
                          de {autor} - {fecha}{kb ? ` - ${kb} KB` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <Tag variant={esPublico ? "pub" : "priv"}>
                          {esPublico ? "publico" : "privado"}
                        </Tag>
                        <span className="text-mute text-[10px] font-mono">
                          enviado
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-mute text-[11px] font-mono">
                          {descargas} desc.
                        </span>
                        <a href={`/api/documentos/${doc.id}/url`}>
                          <Button variant="ghost" size="sm">Descargar</Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function agruparPorRemitente(entradas: EntradaCompartida[]) {
  const grupos = new Map<string, EntradaCompartida[]>();
  for (const entrada of entradas) {
    const actuales = grupos.get(entrada.remitenteId) ?? [];
    actuales.push(entrada);
    grupos.set(entrada.remitenteId, actuales);
  }

  return [...grupos.entries()].map(([remitenteId, entradasGrupo]) => ({
    remitenteId,
    entradas: entradasGrupo,
  }));
}

function contarDescargas(descargas: { documento_id: string }[]) {
  const conteo = new Map<string, number>();
  for (const descarga of descargas) {
    conteo.set(descarga.documento_id, (conteo.get(descarga.documento_id) ?? 0) + 1);
  }
  return conteo;
}
