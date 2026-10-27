/** Solo permite rutas internas como destino tras iniciar sesión (evita redirecciones abiertas). */
export function safeNextPath(value: string | null | undefined, fallback = "/cuenta"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
