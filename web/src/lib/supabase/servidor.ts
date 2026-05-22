import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions,
 * Route Handlers). Usa las cookies de la petición y respeta la RLS.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesAEstablecer) {
          try {
            for (const { name, value, options } of cookiesAEstablecer) {
              almacenCookies.set(name, value, options);
            }
          } catch {
            // Invocado desde un Server Component: el refresco de la sesión
            // lo gestiona proxy.ts. Se puede ignorar sin problema.
          }
        },
      },
    },
  );
}
