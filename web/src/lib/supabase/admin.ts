import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave service_role: OMITE la RLS.
 * Usar SOLO en código de servidor y para operaciones privilegiadas
 * (nunca exponer esta clave al navegador).
 */
export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
