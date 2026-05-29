import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioInlineCarpeta } from "./FormularioInlineCarpeta";
import { FilaCarpeta } from "./FilaCarpeta";

export default async function PaginaCarpetas() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();

  const { data: carpetas } = await admin
    .from("carpetas")
    .select("id, nombre")
    .eq("user_id", user.id)
    .is("org_id", null)
    .order("nombre");

  const { data: conteos } = await admin
    .from("Documentos")
    .select("carpeta_id")
    .eq("user_id", user.id)
    .not("carpeta_id", "is", null);

  const conteosPorCarpeta: Record<string, number> = {};
  for (const d of conteos ?? []) {
    if (d.carpeta_id) {
      conteosPorCarpeta[d.carpeta_id] = (conteosPorCarpeta[d.carpeta_id] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">— organización</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
            Mis <em className="italic text-accent">carpetas</em>
          </h1>
          <p className="text-mute text-[12px] font-mono mt-1">
            {carpetas?.length ?? 0} carpeta{carpetas?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <FormularioInlineCarpeta />

      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-[1fr_100px_80px_80px] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
              <div>Carpeta</div>
              <div>Documentos</div>
              <div></div>
              <div></div>
            </div>
            {!carpetas || carpetas.length === 0 ? (
              <div className="px-5 py-10 text-center text-mute text-sm">
                No tienes carpetas todavía.
              </div>
            ) : (
              carpetas.map((c) => (
                <FilaCarpeta key={c.id} carpeta={c} ndocs={conteosPorCarpeta[c.id] ?? 0} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
