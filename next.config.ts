import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// La CSP con nonces llega en un bloque posterior; estas cabeceras aplican ya a todas las rutas.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara se habilita para el escaneo de QR del modo caja (Fase B).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Cache Components queda desactivado a propósito: casi todo el contenido es por usuario y por
  // restaurante, y una caché compartida mal etiquetada podría filtrar datos entre tenants.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
