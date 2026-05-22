import Link from "next/link";
import { redirect } from "next/navigation";

import { cerrarSesion } from "@/app/(auth)/acciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Layout de la zona autenticada. Exige sesión iniciada. */
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-4 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <Link href="/inicio" className="font-semibold">
          Gestión Documental
        </Link>
        <span className="ml-auto text-sm text-gray-500">{user.email}</span>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
