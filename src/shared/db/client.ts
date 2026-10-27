import "server-only";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { serverEnv } from "@/shared/config/env";

export type Db = NodePgDatabase;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __appPool?: Pool; __appDb?: Db };

/** Pool del rol `app_user`: no es propietario de las tablas, así que RLS siempre aplica. */
export function getPool(): Pool {
  if (!globalForDb.__appPool) {
    globalForDb.__appPool = new Pool({ connectionString: serverEnv().DATABASE_URL, max: 10 });
  }
  return globalForDb.__appPool;
}

export function getDb(): Db {
  if (!globalForDb.__appDb) {
    globalForDb.__appDb = drizzle(getPool());
  }
  return globalForDb.__appDb;
}

/**
 * Ejecuta `fn` en una transacción con el usuario fijado en `app.user_id`, que es lo que leen las
 * políticas RLS. `set_config(..., true)` es local a la transacción, así que funciona detrás de un
 * pooler en modo transacción y nunca se filtra a otra petición.
 */
export async function withActor<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId ?? ""}, true)`);
    return fn(tx);
  });
}

/** Transacción de procesos internos (cola de eventos). Solo la usa código de servidor sin entrada de usuario. */
export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.system', 'on', true)`);
    return fn(tx);
  });
}
