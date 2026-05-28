import { redirect } from "next/navigation";

import { ToastProvider } from "@/components/ui/Toast";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";

import { AppLayoutClient } from "./AppLayoutClient";

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
      <AppLayoutClient perfil={perfil} userEmail={user.email ?? ""}>
        {children}
      </AppLayoutClient>
    </ToastProvider>
  );
}
