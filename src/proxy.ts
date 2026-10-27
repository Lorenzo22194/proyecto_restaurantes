import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/cuenta", "/perfil", "/bienvenida", "/panel", "/admin"];

/**
 * Comprobación optimista: si no hay cookie de sesión, redirige al acceso sin tocar la base de datos.
 * La verificación real (sesión válida, cuenta activa, permisos) ocurre siempre en el servidor, en
 * cada página y acción. También asigna un identificador de petición para la auditoría.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected && !getSessionCookie(request, { cookiePrefix: "sobremesa" })) {
    const login = new URL("/entrar", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", crypto.randomUUID());
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
