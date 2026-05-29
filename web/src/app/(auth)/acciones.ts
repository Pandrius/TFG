"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  validarEmail,
  validarNombreUsuario,
  validarPassword,
} from "@/lib/auth/validaciones";

export type EstadoFormulario =
  | { error: string; campo?: string }
  | { ok: string }
  | undefined;

const COOKIE_SESION_CACHE = "dres_sesion";
const CACHE_SESION_MAX_AGE = 60 * 60 * 24 * 7;

export async function registrarse(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const nombreUsuario = String(datos.get("nombre_usuario") ?? "").trim();
  const nombreCompleto = String(datos.get("nombre_completo") ?? "").trim();
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");
  const passwordConfirm = String(datos.get("password_confirm") ?? "");

  const errorUser = validarNombreUsuario(nombreUsuario);
  if (errorUser) return { error: errorUser, campo: "nombre_usuario" };

  const errorEmail = validarEmail(email);
  if (errorEmail) return { error: errorEmail, campo: "email" };

  const errorPass = validarPassword(password);
  if (errorPass) return { error: errorPass, campo: "password" };

  if (password !== passwordConfirm) {
    return { error: "Las contraseñas no coinciden.", campo: "password_confirm" };
  }

  // Chequeo de unicidad del nombre_usuario antes de crear la cuenta.
  const admin = crearClienteAdmin();
  const { data: existe } = await admin
    .from("profiles")
    .select("id")
    .eq("nombre_usuario", nombreUsuario)
    .maybeSingle();

  if (existe) {
    return {
      error: "Ese nombre de usuario ya está en uso.",
      campo: "nombre_usuario",
    };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre_usuario: nombreUsuario,
        nombre_completo: nombreCompleto || null,
      },
    },
  });
  if (error) return { error: traducirError(error.message) };

  await guardarCacheSesion(true);
  redirect("/inicio");
}

export async function iniciarSesion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce email y contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traducirError(error.message) };

  await guardarCacheSesion(true);
  redirect("/inicio");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  await guardarCacheSesion(false);
  redirect("/login");
}

export async function solicitarRecuperacion(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "").trim();

  const errorEmail = validarEmail(email);
  if (errorEmail) return { error: errorEmail };

  const supabase = await crearClienteServidor();
  const cabeceras = await headers();
  const host = cabeceras.get("host") ?? "localhost:3000";
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  // No comprobamos si el email existe: respondemos siempre con éxito
  // para evitar enumeración de usuarios.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocolo}://${host}/recuperar/confirmar`,
  });

  return {
    ok: "Si ese email está registrado, te hemos enviado un enlace para restablecer la contraseña.",
  };
}

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

async function guardarCacheSesion(logueado: boolean) {
  const store = await cookies();
  store.set(COOKIE_SESION_CACHE, logueado ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    maxAge: logueado ? CACHE_SESION_MAX_AGE : 60,
  });
}
