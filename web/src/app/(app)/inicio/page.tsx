import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export default async function PaginaInicio() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_completo, nombre_usuario")
    .eq("id", user.id)
    .single();

  const { count: totalDocs } = await admin
    .from("Documentos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const saludo = perfil?.nombre_completo
    ? perfil.nombre_completo.split(/\s+/)[0]
    : perfil?.nombre_usuario ?? "";

  return (
    <div className="max-w-5xl mx-auto p-8 flex flex-col gap-10">
      <header>
        <p className="font-display italic text-accent text-sm m-0">
          — bienvenido a tu archivo
        </p>
        <h1 className="font-display font-medium text-5xl tracking-[-0.02em] m-0 mt-1">
          Hola, <em className="italic text-accent">{saludo}</em>.
        </h1>
        <p className="text-mute text-base font-display italic mt-3">
          {totalDocs ?? 0} documento{totalDocs === 1 ? "" : "s"} en tu archivo.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AtajoCard
          href="/mis-documentos"
          eyebrow="empieza"
          titulo="Subir un documento"
          descripcion="Arrastra un archivo y déjalo en manos del modelo."
        />
        <AtajoCard
          href="/mis-documentos"
          eyebrow="organiza"
          titulo="Ver mis documentos"
          descripcion="Tu archivo personal — clasifica, renombra, elimina."
        />
        <AtajoCard
          href="/explorar"
          eyebrow="descubre"
          titulo="Explorar la comunidad"
          descripcion="Documentos públicos compartidos por otros usuarios."
        />
      </div>
    </div>
  );
}

function AtajoCard({
  href,
  eyebrow,
  titulo,
  descripcion,
}: {
  href: string;
  eyebrow: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[18px] border border-rule bg-card p-6 hover:border-accent-soft-hover transition-colors"
    >
      <p className="font-display italic text-accent text-xs m-0">— {eyebrow}</p>
      <h2 className="font-display font-medium text-[22px] tracking-[-0.01em] m-0">
        {titulo}
      </h2>
      <p className="text-mute text-[13px] leading-[1.55] m-0">{descripcion}</p>
      <span className="text-accent text-sm font-medium mt-auto">→</span>
    </Link>
  );
}
