/**
 * Límites del monolito modular. Cada módulo de src/modules/<dominio> expone su API pública en
 * index.ts; nadie fuera del módulo importa sus carpetas internas.
 *
 * Excepciones explícitas:
 *  - infrastructure/schema.ts puede importar otros schema.ts solo para declarar claves foráneas.
 *  - identity/client.ts es el cliente de autenticación para componentes de navegador.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "modulo-solo-por-api-publica",
      comment: "Entre módulos solo se importa index.ts (o el esquema, para claves foráneas).",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/",
        // Los esquemas ajenos los controla la regla fk-solo-desde-esquemas.
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index\\.ts$", "^src/modules/[^/]+/infrastructure/schema\\.ts$"],
      },
    },
    {
      name: "fk-solo-desde-esquemas",
      comment: "Importar el esquema de otro módulo solo se permite desde otro schema.ts.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/", pathNot: "^src/modules/[^/]+/infrastructure/schema\\.ts$" },
      to: { path: "^src/modules/([^/]+)/infrastructure/schema\\.ts$", pathNot: "^src/modules/$1/" },
    },
    {
      name: "app-usa-api-publica",
      comment: "Las rutas y la composición usan index.ts de cada módulo (o identity/client.ts en el navegador).",
      severity: "error",
      from: { path: "^src/(app|composition)/" },
      to: {
        path: "^src/modules/[^/]+/",
        pathNot: ["^src/modules/[^/]+/index\\.ts$", "^src/modules/identity/client\\.ts$"],
      },
    },
    {
      name: "dominio-puro",
      comment: "domain/ no depende de infraestructura, base de datos, Next ni otras capas.",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: {
        path: ["^src/modules/[^/]+/(application|infrastructure)/", "^src/shared/(db|http|mail|outbox)/", "node_modules/(next|pg|drizzle-orm|better-auth)/"],
      },
    },
    {
      name: "shared-no-depende-de-modulos",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/(modules|app|composition)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default", "types"] },
  },
};
