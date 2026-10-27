import { enableLocalAppRole, migrateDatabase } from "./migrate-lib";

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Falta DATABASE_ADMIN_URL");

await migrateDatabase(adminUrl);
console.log("Migraciones aplicadas.");

if (process.argv.includes("--local-app-role")) {
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) throw new Error("Falta DATABASE_URL");
  await enableLocalAppRole(adminUrl, appUrl);
  console.log("Rol app_user habilitado para desarrollo local.");
}
