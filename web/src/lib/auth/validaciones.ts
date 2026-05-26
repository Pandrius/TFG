/**
 * Validadores puros para los campos del flujo de auth.
 * Devuelven null si el valor es válido, o un mensaje de error en español.
 */

const REGEX_USERNAME = /^[a-zA-Z0-9._]+$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarNombreUsuario(valor: string): string | null {
  if (valor.length < 3) return "El nombre de usuario debe tener al menos 3 caracteres.";
  if (valor.length > 32) return "El nombre de usuario no puede pasar de 32 caracteres.";
  if (!REGEX_USERNAME.test(valor)) {
    return "Solo se permiten letras, números, punto y guion bajo.";
  }
  return null;
}

export function validarEmail(valor: string): string | null {
  if (!REGEX_EMAIL.test(valor)) return "Introduce un email válido.";
  return null;
}

export function validarPassword(valor: string): string | null {
  if (valor.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}
