import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";

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

  // Si es mi propio perfil, puedo redirigir a /perfil o mostrarlo igual
  // Para el TFG, permitimos ver el perfil de cualquiera

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nombre_usuario, nombre_completo, avatar_url")
    .eq("id", id)
    .single();

  if (!perfil) notFound();

  // Obtener documentos visibles de este usuario
  // (Públicos si no soy yo, todos si soy yo - aunque para eso está /mis-documentos)
  const query = supabase
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("user_id", id)
    .order("fecha", { ascending: false });

  if (me.id !== id) {
    query.eq("confidencialidad", 0);
  }

  const { data: documentos } = await query;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Cabecera del Perfil */}
      <div className="flex items-center gap-6 bg-paper border border-rule rounded-[20px] p-6 shadow-[var(--shadow-1)]">
        <Avatar
          nombreCompleto={perfil.nombre_completo}
          nombreUsuario={perfil.nombre_usuario}
          avatarUrl={perfil.avatar_url}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="font-display font-medium text-2xl tracking-tight">
            {perfil.nombre_completo || perfil.nombre_usuario}
          </h1>
          <p className="text-mute font-mono text-sm mt-0.5">@{perfil.nombre_usuario}</p>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div>
        <h2 className="font-display font-medium text-lg mb-4 flex items-center gap-2">
          Documentos <em className="italic text-accent">compartidos</em>
          <span className="text-mute font-mono text-xs ml-2">({documentos?.length ?? 0})</span>
        </h2>

        {!documentos?.length ? (
          <div className="py-12 text-center bg-soft rounded-[14px] border border-dashed border-rule">
            <p className="text-mute text-sm italic font-display">
              Este usuario aún no ha compartido documentos públicos.
            </p>
          </div>
        ) : (
          <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
            {documentos.map((doc) => {
              const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
              const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
              const tipo = (doc.tipo_archivo ?? "").toUpperCase();
              const esPublico = doc.confidencialidad === 0;

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
                      {fecha} {kb ? ` · ${kb} KB` : ""}
                    </p>
                  </div>
                  <Tag variant={esPublico ? "pub" : "priv"}>
                    {esPublico ? "público" : "privado"}
                  </Tag>
                  <Link href={`/documentos/${doc.id}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: any) {
  const base = "inline-flex items-center justify-center rounded-full font-medium transition-all active:scale-[0.98] disabled:opacity-50";
  const variants: any = {
    primary: "bg-accent text-white hover:bg-accent-hover shadow-sm",
    ghost: "text-mute hover:text-ink hover:bg-soft",
  };
  const sizes: any = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-5 py-2.5 text-[14px]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
