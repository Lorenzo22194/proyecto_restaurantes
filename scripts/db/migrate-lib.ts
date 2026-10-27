import path from "node:path";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, "../../db/migrations");

export async function migrateDatabase(adminUrl: string): Promise<void> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}

/**
 * Las migraciones crean `app_user` sin LOGIN y sin contraseña. En local y en pruebas se le da la
 * contraseña de DATABASE_URL; en producción la gestiona la infraestructura, nunca el código.
 */
export async function enableLocalAppRole(adminUrl: string, appUrl: string): Promise<void> {
  const app = new URL(appUrl);
  if (!["localhost", "127.0.0.1"].includes(app.hostname)) {
    throw new Error("enableLocalAppRole solo se permite contra una base de datos local");
  }
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const password = decodeURIComponent(app.password);
    const literal = await client.query("select quote_literal($1) as value", [password]);
    await client.query(`alter role app_user with login password ${literal.rows[0].value}`);
  } finally {
    await client.end();
  }
}
