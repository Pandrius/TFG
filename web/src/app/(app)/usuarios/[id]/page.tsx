import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { UsuarioInvitable } from "../../documentos/[id]/FormularioInvitacion";
import { AccionesUsuario } from "./AccionesUsuario";
import { AvatarPerfilAmpliable } from "./AvatarPerfilAmpliable";
import { BotonEnviarDocumentoPerfil } from "./BotonEnviarDocumentoPerfil";

type CarpetaPerfil = {
  id: string;
  nombre: string;
  parent_id: string | null;
};

type DocumentoPerfil = {
  id: string;
  nombre: string;
  tipo_archivo: string | null;
  confidencialidad: number | null;
  tamano_bytes: number | null;
  fecha: string;
  carpeta_id: string | null;
};

export default async function PaginaPerfilUsuario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();
  if (!me) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .eq("id", id)
    .single();
  if (!perfil) notFound();

  const [{ data: favorito }, { data: accesoPorFavorito }, { data: amistadData }] = await Promise.all([
    admin
      .from("favoritos")
      .select("favorito_id")
      .eq("propietario_id", me.id)
      .eq("favorito_id", id)
      .maybeSingle(),
    admin
      .from("favoritos")
      .select("propietario_id")
      .eq("propietario_id", id)
      .eq("favorito_id", me.id)
      .maybeSingle(),
    admin
      .from("amistades")
      .select("solicitante_id, receptor_id, estado")
      .or(
        `and(solicitante_id.eq.${me.id},receptor_id.eq.${id}),and(solicitante_id.eq.${id},receptor_id.eq.${me.id})`,
      )
      .maybeSingle(),
  ]);

  const amistad =
    !amistadData
      ? ({ estado: "ninguna" } as const)
      : amistadData.estado === "aceptada"
        ? ({ estado: "aceptada" } as const)
        : amistadData.solicitante_id === me.id
          ? ({ estado: "pendiente_enviada" } as const)
          : ({ estado: "pendiente_recibida" } as const);

  const query = admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha, carpeta_id")
    .eq("user_id", id)
    .order("fecha", { ascending: false });
  if (me.id !== id && !accesoPorFavorito) query.eq("confidencialidad", 0);

  const [{ data: documentosData }, { data: carpetasData }] = await Promise.all([
    query,
    admin
      .from("carpetas")
      .select("id, nombre, parent_id")
      .eq("user_id", id)
      .is("org_id", null)
      .order("nombre"),
  ]);

  const documentos = (documentosData ?? []) as DocumentoPerfil[];
  const carpetas = (carpetasData ?? []) as CarpetaPerfil[];
  const puedeVerPrivados = me.id === id || !!accesoPorFavorito;
  const carpetasVisibles = carpetas
    .filter((carpeta) => carpeta.parent_id === null && contarVisibles(carpeta.id, carpetas, documentos) > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const docsSinCarpeta = documentos.filter((doc) => !doc.carpeta_id);
  const totalCompartidos = documentos.length;
  const { data: perfilesDisponibles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .neq("id", me.id)
    .neq("id", id)
    .order("nombre_usuario");
  const usuariosInvitables: UsuarioInvitable[] = perfilesDisponibles ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-6 bg-paper border border-rule rounded-[20px] p-6 shadow-[var(--shadow-1)]">
        <AvatarPerfilAmpliable
          nombreCompleto={perfil.nombre_completo}
          nombreUsuario={perfil.nombre_usuario}
          avatarUrl={perfil.avatar_url}
        />
        <div className="flex-1">
          <h1 className="font-display font-medium text-2xl tracking-tight">
            {perfil.nombre_completo || perfil.nombre_usuario}
          </h1>
          <p className="text-mute font-mono text-sm mt-0.5">@{perfil.nombre_usuario}</p>
        </div>
        {me.id !== id && (
          <AccionesUsuario
            usuarioId={id}
            esFavorito={!!favorito}
            amistad={amistad}
          />
        )}
      </div>

      <div>
        <h2 className="font-display font-medium text-lg mb-4 flex items-center gap-2">
          Documentos <em className="italic text-accent">compartidos</em>
          <span className="text-mute font-mono text-xs ml-2">({totalCompartidos})</span>
        </h2>

        {carpetasVisibles.length === 0 && docsSinCarpeta.length === 0 ? (
          <div className="py-12 text-center bg-soft rounded-[14px] border border-dashed border-rule">
            <p className="text-mute text-sm italic font-display">
              Este usuario aun no tiene documentos visibles para ti.
            </p>
          </div>
        ) : (
          <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            {carpetasVisibles.map((carpeta) => (
              <div
                key={carpeta.id}
                className="grid grid-cols-[44px_1fr_120px_auto] items-center px-5 py-3 gap-3.5 border-b border-rule text-[13px]"
              >
                <span className="w-9 h-9 rounded-[8px] border border-rule bg-card grid place-items-center text-accent font-semibold">
                  /
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/carpetas/${carpeta.id}`}
                    className="font-medium hover:text-accent transition-colors truncate block"
                  >
                    {carpeta.nombre}
                  </Link>
                  <p className="text-mute text-[11px] font-mono mt-0.5">
                    {contarVisibles(carpeta.id, carpetas, documentos)} documentos visibles
                  </p>
                </div>
                <Tag variant="pub">carpeta</Tag>
                <Link href={`/carpetas/${carpeta.id}`}>
                  <Button variant="ghost" size="sm">Abrir</Button>
                </Link>
              </div>
            ))}

            {docsSinCarpeta.map((doc) => {
              const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
              const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
              const tipo = (doc.tipo_archivo ?? "").toUpperCase();
              const esPublico = doc.confidencialidad === 0;

              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-[44px_1fr_120px_150px] items-center px-5 py-3 gap-3.5 border-b border-rule last:border-b-0 text-[13px]"
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
                      {fecha} {kb ? ` - ${kb} KB` : ""}
                    </p>
                  </div>
                  <Tag variant={esPublico ? "pub" : "priv"}>
                    {esPublico ? "publico" : puedeVerPrivados ? "privado accesible" : "privado"}
                  </Tag>
                  <div className="flex items-center justify-end gap-1">
                    {esPublico && (
                      <BotonEnviarDocumentoPerfil
                        documentoId={doc.id}
                        nombre={doc.nombre}
                        usuarios={usuariosInvitables}
                      />
                    )}
                    <Link href={`/documentos/${doc.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function contarVisibles(
  carpetaId: string,
  carpetas: CarpetaPerfil[],
  documentos: DocumentoPerfil[],
) {
  const descendientes = new Set([carpetaId]);
  let cambio = true;

  while (cambio) {
    cambio = false;
    for (const carpeta of carpetas) {
      if (carpeta.parent_id && descendientes.has(carpeta.parent_id) && !descendientes.has(carpeta.id)) {
        descendientes.add(carpeta.id);
        cambio = true;
      }
    }
  }

  return documentos.filter((doc) => doc.carpeta_id && descendientes.has(doc.carpeta_id)).length;
}
