import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";

const COOKIE_SESION_CACHE = "dres_sesion";

export default async function PaginaPrincipal() {
  const store = await cookies();
  if (store.get(COOKIE_SESION_CACHE)?.value === "1") {
    redirect("/mis-documentos");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 text-center">
      <header className="max-w-2xl flex flex-col gap-4">
        <p className="font-display italic text-accent text-base m-0">
          — una forma más serena de archivar.
        </p>
        <h1 className="font-display font-medium text-5xl sm:text-6xl tracking-[-0.025em] leading-[1.05] m-0">
          Tus documentos, <em className="italic text-accent">protegidos</em> sin que
          tengas que pensarlo.
        </h1>
        <p className="text-base text-mute leading-relaxed max-w-md mx-auto">
          Sube cualquier archivo. Una IA decide si puede ver la luz o no. Tú revisas,
          lo cambias si hace falta, y sigues con tu día.
        </p>
      </header>
      <div className="flex gap-3">
        <Link href="/registro">
          <Button variant="accent" size="lg">
            Crear cuenta
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" size="lg">
            Iniciar sesión
          </Button>
        </Link>
      </div>
    </main>
  );
}
