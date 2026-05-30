import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { aceptarAmistad, eliminarAmistad, rechazarAmistad } from "../usuarios/acciones";
import { AgregarAmigo, type UsuarioParaAmistad } from "./AgregarAmigo";

type Perfil = {
  id: string;
  nombre_usuario: string;
  nombre_completo: string | null;
  avatar_url: string | null;
};

export default async function PaginaAmigos() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: relaciones } = await admin
    .from("amistades")
    .select("id, solicitante_id, receptor_id, estado, fecha")
    .or(`solicitante_id.eq.${user.id},receptor_id.eq.${user.id}`)
    .order("fecha", { ascending: false });

  const userIds = [
    ...new Set(
      (relaciones ?? []).flatMap((r) => [r.solicitante_id, r.receptor_id]).filter((id) => id !== user.id),
    ),
  ];
  const perfilesPorId = new Map<string, Perfil>();
  if (userIds.length > 0) {
    const { data: perfiles } = await admin
      .from("profiles")
      .select("id, nombre_usuario, nombre_completo, avatar_url")
      .in("id", userIds);
    for (const perfil of perfiles ?? []) perfilesPorId.set(perfil.id, perfil);
  }

  const pendientesRecibidas = (relaciones ?? []).filter(
    (r) => r.estado === "pendiente" && r.receptor_id === user.id,
  );
  const pendientesEnviadas = (relaciones ?? []).filter(
    (r) => r.estado === "pendiente" && r.solicitante_id === user.id,
  );
  const amigos = (relaciones ?? []).filter((r) => r.estado === "aceptada");
  const relacionadosIds = new Set([
    user.id,
    ...(relaciones ?? []).flatMap((r) => [r.solicitante_id, r.receptor_id]),
  ]);
  const { data: perfilesDisponibles } = await admin
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .order("nombre_usuario");
  const usuariosDisponibles: UsuarioParaAmistad[] =
    perfilesDisponibles?.filter((perfil) => !relacionadosIds.has(perfil.id)) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">— red</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
            Amigos
          </h1>
          <p className="text-mute text-[13px] mt-1">
            {amigos.length} amigo{amigos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AgregarAmigo usuarios={usuariosDisponibles} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
          Solicitudes recibidas
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {pendientesRecibidas.length === 0 ? (
            <p className="px-5 py-6 text-center text-mute text-sm">No tienes solicitudes pendientes.</p>
          ) : (
            pendientesRecibidas.map((relacion) => {
              const perfil = perfilesPorId.get(relacion.solicitante_id);
              if (!perfil) return null;
              return (
                <FilaPerfil key={relacion.id} perfil={perfil}>
                  <form action={aceptarAmistad.bind(null, relacion.id)}>
                    <Button type="submit" variant="primary" size="sm">Aceptar</Button>
                  </form>
                  <form action={rechazarAmistad.bind(null, relacion.id)}>
                    <Button type="submit" variant="ghost" size="sm">Rechazar</Button>
                  </form>
                </FilaPerfil>
              );
            })
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
          Mis amigos
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
          {amigos.length === 0 ? (
            <p className="px-5 py-6 text-center text-mute text-sm">Todavia no tienes amigos agregados.</p>
          ) : (
            amigos.map((relacion) => {
              const otroId =
                relacion.solicitante_id === user.id ? relacion.receptor_id : relacion.solicitante_id;
              const perfil = perfilesPorId.get(otroId);
              if (!perfil) return null;
              return (
                <FilaPerfil key={relacion.id} perfil={perfil}>
                  <form action={eliminarAmistad.bind(null, otroId)}>
                    <Button type="submit" variant="ghost" size="sm">Eliminar</Button>
                  </form>
                </FilaPerfil>
              );
            })
          )}
        </div>
      </section>

      {pendientesEnviadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-medium text-lg tracking-[-0.01em]">
            Solicitudes enviadas
          </h2>
          <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            {pendientesEnviadas.map((relacion) => {
              const perfil = perfilesPorId.get(relacion.receptor_id);
              if (!perfil) return null;
              return (
                <FilaPerfil key={relacion.id} perfil={perfil}>
                  <form action={rechazarAmistad.bind(null, relacion.id)}>
                    <Button type="submit" variant="ghost" size="sm">Cancelar</Button>
                  </form>
                </FilaPerfil>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function FilaPerfil({
  perfil,
  children,
}: {
  perfil: Perfil;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-rule last:border-b-0">
      <Avatar
        nombreCompleto={perfil.nombre_completo}
        nombreUsuario={perfil.nombre_usuario}
        avatarUrl={perfil.avatar_url}
        size="sm"
      />
      <Link href={`/usuarios/${perfil.id}`} className="min-w-0 flex-1">
        <p className="font-medium text-[13px] truncate">
          {perfil.nombre_completo || perfil.nombre_usuario}
        </p>
        <p className="text-mute text-[11px] font-mono">@{perfil.nombre_usuario}</p>
      </Link>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
