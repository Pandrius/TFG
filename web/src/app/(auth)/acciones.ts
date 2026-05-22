"use server";

import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoFormulario = { error: string } | undefined;

/** Registro de un usuario nuevo (email + contraseña). */
export async function registrarse(
  _estadoPrevio: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");
  const nombreCompleto = String(datos.get("nombre_completo") ?? "").trim();

  if (!email || !password) {
    return { error: "El email y la contraseña son obligatorios." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre_completo: nombreCompleto } },
  });
  if (error) return { error: traducirError(error.message) };

  redirect("/inicio");
}

/** Inicio de sesión (email + contraseña). */
export async function iniciarSesion(
  _estadoPrevio: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");

  if (!email || !password) {
    return { error: "El email y la contraseña son obligatorios." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traducirError(error.message) };

  redirect("/inicio");
}

/** Cierre de sesión. */
export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Traduce los mensajes de error más comunes de Supabase Auth al español. */
function traducirError(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (mensaje.toLowerCase().includes("already registered")) {
    return "Ese email ya está registrado.";
  }
  if (mensaje.includes("Password should be")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  return mensaje;
}
