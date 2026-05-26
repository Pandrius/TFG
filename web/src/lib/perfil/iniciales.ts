/**
 * Calcula las 2 iniciales para el avatar.
 * Prioridad: primer y último token del nombre completo; si no hay,
 * primeras 2 letras del nombre de usuario.
 */
export function calcularIniciales(
  nombreCompleto: string | null,
  nombreUsuario: string,
): string {
  const completo = (nombreCompleto ?? "").trim();
  if (completo) {
    const tokens = completo.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      const primero = tokens[0]?.[0] ?? "";
      const ultimo = tokens[tokens.length - 1]?.[0] ?? "";
      return (primero + ultimo).toUpperCase();
    }
    if (tokens.length === 1) {
      return tokens[0].slice(0, 2).toUpperCase();
    }
  }
  return nombreUsuario.slice(0, 2).toUpperCase();
}
