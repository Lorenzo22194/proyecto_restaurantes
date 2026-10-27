# Sobremesa (nombre provisional)

Plataforma multirestaurante de fidelización e inteligencia de clientes. Este repositorio contiene el
**Bloque 1 (Fase A)**: fundamentos de identidad, multi-tenant, auditoría y design system.

## Estado del Bloque 1

| Incluido | Fuera de este bloque |
|---|---|
| Acceso por código de un solo uso al correo (Better Auth) | Campañas, puntos, QR, premios (Fase B) |
| Consentimiento versionado de términos y aviso de IA | Feedback e IA (Fase C) |
| Alta de restaurante → revisión por administrador | Comisiones y facturación (Fase D) |
| Equipo: invitar, aceptar con correo verificado, revocar | MFA TOTP para dueños y administradores |
| RLS en PostgreSQL + autorización en la aplicación | CSP con nonces |
| Auditoría de solo inserción, cola de eventos (outbox) | Proveedor de correo real y rate limit compartido (D8) |
| Design system base y esqueleto de los 3 portales | Exploración pública de restaurantes |

## Decisiones aplicadas

- **D1** Idioma español; moneda y zona horaria por restaurante. País y ley aplicable: pendientes (antes de la Fase D).
- **D2** Next.js 16 + TypeScript + Tailwind 4 + PostgreSQL 17 + Drizzle. **Auth: Better Auth** en lugar de
  Supabase Auth (aprobado: no hay Docker en el equipo de desarrollo y así las sesiones viven en nuestro
  propio Postgres). En producción sirve cualquier Postgres administrado (Supabase, Neon…).
- **D3** Trabajos en segundo plano con tabla `outbox_events` + cron (`vercel.json`, requiere plan Pro).
- **D4** Nombre provisional "Sobremesa", centralizado en `src/shared/config/brand.ts`.

## Puesta en marcha local (Windows, sin Docker)

```bash
pnpm install
cp .env.example .env.local        # y rellena los secretos (el archivo explica cómo generarlos)
echo DEV_MAILBOX=1 > .env.development.local
pnpm db:start                     # PostgreSQL 17 embebido en ~/.sobremesa/pgdata (déjalo abierto)
pnpm db:migrate                   # en otra terminal
pnpm dev
```

- Los códigos de acceso e invitaciones aparecen en <http://localhost:3000/dev/correo>.
- Para tener un administrador: entra una vez con tu correo y ejecuta `pnpm admin:grant-role tu@correo.com admin`.
- La carpeta de datos de Postgres vive fuera de OneDrive a propósito: la sincronización bloquea sus archivos.

## Comprobaciones

```bash
pnpm check   # typecheck + eslint + límites entre módulos + pruebas
```

Las pruebas de integración levantan un PostgreSQL desechable y aplican las migraciones reales. Cubren
aislamiento entre restaurantes (escenario 13), restricciones del personal (14, parcial), RLS directa
en SQL, inmutabilidad de la auditoría, acceso OTP con límite de intentos y la cola de eventos.

## Arquitectura

```
src/
  app/                 rutas: landing, (consumidor), panel/, admin/, api/
  composition/         raíz de composición (manejadores de la cola de eventos)
  modules/<dominio>/   identity · restaurants · audit-security
    domain/            reglas puras (sin I/O)
    application/       casos de uso con autorización
    infrastructure/    esquema Drizzle, adaptadores
    index.ts           API pública del módulo
  shared/              db, errores, http, correo, outbox, kernel (Actor), ui (design system)
db/migrations/         SQL generado por drizzle-kit + migraciones de seguridad (RLS, triggers)
```

Los límites entre módulos los verifica `pnpm lint:boundaries` (`.dependency-cruiser.cjs`).

### Modelo de seguridad

- La aplicación se conecta como `app_user`, que no es dueño de las tablas ni puede saltarse RLS.
- Cada operación corre en una transacción con `app.user_id` fijado localmente (`withActor`); las
  políticas RLS lo usan para aislar restaurantes aunque la capa de aplicación tuviera un fallo.
- Triggers impiden cambiar el estado de un restaurante sin rol de administrador, escalar roles en el
  equipo y modificar o borrar la auditoría (ni siquiera el propietario de la tabla).
- Las rutas ajenas o inexistentes responden 404 para no revelar qué existe.
- Excepción documentada: las tablas internas de Better Auth (`users`, `sessions`, `accounts`,
  `verifications`, `rate_limits`) no tienen RLS; solo las usa el módulo Identity.
