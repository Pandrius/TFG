"use server";

import { revalidatePath } from "next/cache";

import { crearClienteServidor } from "@/lib/supabase/servidor";
import { validarPassword } from "@/lib/auth/validaciones";

export type Resultado =
  | { ok: string }
  | { error: string; campo?: string }
  | undefined;

export async function actualizarPerfil(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const nombreCompleto = String(datos.get("nombre_completo") ?? "").trim();
  if (nombreCompleto.length > 80) {
    return { error: "Máximo 80 caracteres.", campo: "nombre_completo" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nombre_completo: nombreCompleto || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { ok: "Perfil actualizado." };
}

export async function cambiarContrasena(
  _previo: Resultado,
  datos: FormData,
): Promise<Resultado> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Sesión expirada." };

  const actual = String(datos.get("actual") ?? "");
  const nueva = String(datos.get("nueva") ?? "");
  const confirmar = String(datos.get("confirmar") ?? "");

  const errPass = validarPassword(nueva);
  if (errPass) return { error: errPass, campo: "nueva" };
  if (nueva !== confirmar) {
    return { error: "Las contraseñas no coinciden.", campo: "confirmar" };
  }

  // Verificar la contraseña actual reautenticando.
  const { error: errAuth } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: actual,
  });
  if (errAuth) return { error: "La contraseña actual no es correcta.", campo: "actual" };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  return { ok: "Contraseña actualizada." };
}
