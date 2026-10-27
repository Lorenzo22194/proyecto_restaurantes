import { Client, Pool } from "pg";
import type { Actor, PlatformRole } from "@/shared/kernel/actor";

let adminPool: Pool | undefined;
let appPool: Pool | undefined;

/** Conexión del propietario del esquema: solo para preparar datos de prueba. */
export function admin(): Pool {
  adminPool ??= new Pool({ connectionString: process.env.DATABASE_ADMIN_URL, max: 2 });
  return adminPool;
}

function app(): Pool {
  appPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return appPool;
}

export async function closeTestPools() {
  await Promise.all([adminPool?.end(), appPool?.end()]);
  adminPool = appPool = undefined;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}@prueba.test`;
}

export async function createUser(prefix: string, platformRoles: PlatformRole[] = []): Promise<Actor> {
  const email = uniqueEmail(prefix);
  const { rows } = await admin().query<{ id: string }>(
    "insert into users (email, name, email_verified) values ($1, $2, true) returning id",
    [email, prefix],
  );
  for (const role of platformRoles) {
    await admin().query("insert into platform_roles (user_id, role) values ($1, $2)", [rows[0].id, role]);
  }
  return { userId: rows[0].id, email, name: prefix, platformRoles };
}

/**
 * Ejecuta SQL directamente como `app_user` con el contexto de un usuario, saltándose la capa de
 * aplicación. Sirve para comprobar que RLS protege los datos aunque el código tuviera un fallo.
 */
export async function queryAs<T extends Record<string, unknown>>(userId: string | null, text: string, params: unknown[] = []) {
  const client = await app().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await client.query<T>(text, params);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function withAdminClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
