import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { quitarDocumentoDeCarpeta } from "../acciones";

export default async function PaginaCarpeta({
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
  const { data: carpeta } = await admin
    .from("carpetas")
    .select("id, nombre, user_id")
    .eq("id", id)
    .single();
  if (!carpeta || carpeta.user_id !== user.id) notFound();

  const { data: docs } = await admin
    .from("Documentos")
    .select("id, nombre, tipo_archivo, confidencialidad, tamano_bytes, fecha")
    .eq("carpeta_id", id)
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <Link
        href="/carpetas"
        className="text-mute text-sm hover:text-ink transition-colors inline-flex items-center gap-1"
      >
        ‹ Carpetas
      </Link>
      <div>
        <p className="font-display italic text-accent text-sm mb-1">— carpeta</p>
        <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
          {carpeta.nombre}
        </h1>
        <p className="text-mute text-[12px] font-mono mt-1">
          {docs?.length ?? 0} documento{docs?.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_120px_100px_120px_auto] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div></div>
          <div>Documento</div>
          <div>Estado</div>
          <div>Tamaño</div>
          <div>Fecha</div>
          <div></div>
        </div>
        {!docs || docs.length === 0 ? (
          <div className="px-5 py-10 text-center text-mute text-sm">
            Esta carpeta está vacía. Mueve documentos desde{" "}
            <Link href="/mis-documentos" className="text-accent hover:underline">
              Mis documentos
            </Link>
            .
          </div>
        ) : (
          docs.map((doc) => {
            const tipo = (doc.tipo_archivo ?? "").toUpperCase();
            const esPublico = (doc.confidencialidad ?? 1) === 0;
            const kb = doc.tamano_bytes ? Math.round(doc.tamano_bytes / 1024) : null;
            const fecha = new Date(doc.fecha).toLocaleDateString("es-ES");
            return (
              <div
                key={doc.id}
                className="grid grid-cols-[44px_1fr_120px_100px_120px_auto] items-center px-5 py-3 gap-3 border-b border-rule last:border-b-0 text-[13px]"
              >
                <span className="w-9 h-11 rounded-[6px] border border-rule bg-card grid place-items-center font-display italic text-accent text-[11px]">
                  {tipo.slice(0, 3) || "?"}
                </span>
                <Link
                  href={`/documentos/${doc.id}`}
                  className="font-medium hover:text-accent transition-colors truncate"
                >
                  {doc.nombre}
                </Link>
                <Tag variant={esPublico ? "pub" : "priv"}>
                  {esPublico ? "público" : "privado"}
                </Tag>
                <span className="text-mute font-mono text-[12px]">
                  {kb !== null ? `${kb} KB` : "—"}
                </span>
                <span className="text-mute font-mono text-[12px]">{fecha}</span>
                <form
                  action={async () => {
                    "use server";
                    await quitarDocumentoDeCarpeta(doc.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Quitar
                  </Button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
