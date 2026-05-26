import Link from "next/link";
import { redirect } from "next/navigation";

import { cerrarSesion } from "@/app/(auth)/acciones";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ToastProvider } from "@/components/ui/Toast";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

const enlacesNav = [
  { href: "/mis-documentos", label: "Mis documentos" },
  { href: "/explorar", label: "Explorar" },
  { href: "/compartidos", label: "Compartidos" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/carpetas", label: "Carpetas" },
  { href: "/organizaciones", label: "Organizaciones" },
];

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

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-col bg-paper">
        <header className="flex items-center gap-5 border-b border-rule bg-card px-6 py-3">
          <Link
            href="/inicio"
            className="font-display font-medium text-lg tracking-tight"
          >
            Dr<em className="italic text-accent">es</em>.
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {enlacesNav.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="text-mute hover:text-ink"
              >
                {e.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/perfil"
              className="flex items-center gap-2 hover:opacity-80"
            >
              <Avatar
                nombreCompleto={perfil?.nombre_completo ?? null}
                nombreUsuario={perfil?.nombre_usuario ?? user.email ?? ""}
                avatarUrl={perfil?.avatar_url ?? null}
                size="md"
              />
              <span className="text-sm font-medium">
                {perfil?.nombre_usuario ?? user.email}
              </span>
            </Link>
            <form action={cerrarSesion}>
              <Button type="submit" variant="ghost" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
