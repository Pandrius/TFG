import Link from "next/link";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Button } from "@/components/ui/Button";
import { FormularioInlineOrg } from "./FormularioInlineOrg";

export default async function PaginaOrganizaciones() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: misOrgs } = await supabase
    .from("org_miembros")
    .select("rol, organizaciones ( id, nombre )")
    .eq("user_id", user.id);

  // Obtener conteo de miembros por org
  const orgIds = (misOrgs ?? [])
    .map((m) => {
      const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
      return org?.id;
    })
    .filter(Boolean) as string[];

  const conteosMap: Record<string, number> = {};
  if (orgIds.length > 0) {
    const { data: conteos } = await supabase
      .from("org_miembros")
      .select("org_id")
      .in("org_id", orgIds);
    for (const c of conteos ?? []) {
      conteosMap[c.org_id] = (conteosMap[c.org_id] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display italic text-accent text-sm mb-1">— equipos</p>
          <h1 className="font-display font-medium text-[26px] tracking-[-0.02em]">
            <em className="italic text-accent">Organizaciones</em>
          </h1>
          <p className="text-mute text-[12px] font-mono mt-1">
            {misOrgs?.length ?? 0} organización{misOrgs?.length !== 1 ? "es" : ""}
          </p>
        </div>
      </div>

      <FormularioInlineOrg />

      <div className="rounded-[14px] border border-rule bg-paper overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_80px] items-center px-5 py-2.5 gap-3 bg-soft text-mute font-display italic text-xs border-b border-rule">
          <div>Organización</div>
          <div>Miembros</div>
          <div></div>
          <div></div>
        </div>
        {!misOrgs || misOrgs.length === 0 ? (
          <div className="px-5 py-10 text-center text-mute text-sm">
            No perteneces a ninguna organización todavía.
          </div>
        ) : (
          misOrgs.map((m) => {
            const org = Array.isArray(m.organizaciones) ? m.organizaciones[0] : m.organizaciones;
            if (!org) return null;
            const nmiembros = conteosMap[org.id] ?? 1;
            return (
              <div
                key={org.id}
                className="grid grid-cols-[1fr_120px_80px_80px] items-center px-5 py-3 gap-3 border-b border-rule last:border-b-0 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{org.nombre}</p>
                  <p className="text-mute text-[11px] font-mono capitalize mt-0.5">{m.rol}</p>
                </div>
                <span className="text-mute font-mono text-[12px]">
                  {nmiembros} miembro{nmiembros !== 1 ? "s" : ""}
                </span>
                <Link href={`/organizaciones/${org.id}`}>
                  <Button variant="ghost" size="sm">Ver</Button>
                </Link>
                <div></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
