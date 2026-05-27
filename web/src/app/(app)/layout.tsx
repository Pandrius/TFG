import Link from "next/link";
import { redirect } from "next/navigation";

import { cerrarSesion } from "@/app/(auth)/acciones";
import { Avatar } from "@/components/ui/Avatar";
import { ToastProvider } from "@/components/ui/Toast";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { BuscadorTrigger } from "./BuscadorTrigger";
import { SidebarNav } from "./SidebarNav";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre_usuario, nombre_completo, avatar_url")
    .eq("id", user.id)
    .single();

  const nombreMostrado =
    perfil?.nombre_completo ?? perfil?.nombre_usuario ?? user.email ?? "";
  const emailMostrado = user.email ?? "";

  return (
    <ToastProvider>
      <div className="flex-1 grid grid-cols-[232px_1fr]">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="sticky top-0 h-screen overflow-y-auto bg-paper border-r border-rule flex flex-col px-4 py-[22px]">
          <Link
            href="/inicio"
            className="font-display font-semibold text-[22px] tracking-tight mb-[22px] px-1 block"
          >
            Dr<em className="italic text-accent">es</em>.
          </Link>

          <BuscadorTrigger />

          <SidebarNav />

          {/* ── Usuario / pie de sidebar ── */}
          <div className="mt-auto pt-[18px] border-t border-rule">
            <Link
              href="/perfil"
              className="flex items-center gap-[10px] px-1 py-2 rounded-[10px] hover:bg-soft transition-colors"
            >
              <Avatar
                nombreCompleto={perfil?.nombre_completo ?? null}
                nombreUsuario={perfil?.nombre_usuario ?? user.email ?? ""}
                avatarUrl={perfil?.avatar_url ?? null}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {nombreMostrado}
                </div>
                <div className="text-mute text-[11px] truncate">
                  {emailMostrado}
                </div>
              </div>
            </Link>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="w-full text-left px-[10px] py-[7px] text-[13px] text-mute hover:text-ink rounded-[10px] hover:bg-soft transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        {/* ── Contenido principal ────────────────────────── */}
        <main className="bg-card min-h-screen">{children}</main>
      </div>
    </ToastProvider>
  );
}
