"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";

import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { validarPassword } from "@/lib/auth/validaciones";

export default function PaginaConfirmarRecuperacion() {
  const router = useRouter();
  const [sesionLista, setSesionLista] = useState(false);
  const [tokenInvalido, setTokenInvalido] = useState(false);
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Al cargar: tomamos los tokens que Supabase deposita en el hash
  // (#access_token=...&refresh_token=...&type=recovery) y los aplicamos
  // a la sesión del navegador.
  useEffect(() => {
    const aplicarTokens = async () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");
      if (!access_token || !refresh_token || type !== "recovery") {
        setTokenInvalido(true);
        return;
      }
      const supabase = crearClienteNavegador();
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        setTokenInvalido(true);
        return;
      }
      // Limpiamos el hash de la URL para no dejar tokens expuestos.
      window.history.replaceState({}, "", "/recuperar/confirmar");
      setSesionLista(true);
    };
    void aplicarTokens();
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errPass = validarPassword(pass);
    if (errPass) return setError(errPass);
    if (pass !== conf) return setError("Las contraseñas no coinciden.");

    setEnviando(true);
    const supabase = crearClienteNavegador();
    const { error: updErr } = await supabase.auth.updateUser({ password: pass });
    setEnviando(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    router.push("/inicio");
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-[18px] border border-rule bg-card p-8 shadow-[var(--shadow-2)]">
        <header>
          <p className="font-display italic text-accent text-sm m-0">
            — restablecer contraseña
          </p>
          <h1 className="font-display font-medium text-3xl tracking-tight m-0 mt-1">
            Crea tu nueva contraseña.
          </h1>
        </header>

        {tokenInvalido && (
          <Alert variant="err" titulo="Enlace inválido o caducado">
            Vuelve a pedir un enlace nuevo desde la pantalla de recuperación.
          </Alert>
        )}

        {!tokenInvalido && !sesionLista && (
          <p className="text-sm text-mute">Validando el enlace…</p>
        )}

        {sesionLista && (
          <form onSubmit={enviar} className="flex flex-col gap-5">
            <FormField
              label="Nueva contraseña"
              htmlFor="pass"
              hint="Mínimo 8 caracteres."
            >
              <PasswordInput
                id="pass"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </FormField>

            <FormField label="Confirmar contraseña" htmlFor="conf">
              <PasswordInput
                id="conf"
                value={conf}
                onChange={(e) => setConf(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                error={conf.length > 0 && conf !== pass}
              />
            </FormField>

            {error && <Alert variant="err">{error}</Alert>}

            <Button type="submit" variant="accent" size="lg" loading={enviando}>
              {enviando ? "Guardando…" : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
