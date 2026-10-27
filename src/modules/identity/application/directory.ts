import "server-only";
import { inArray } from "drizzle-orm";
import type { Tx } from "@/shared/db/client";
import { users } from "../infrastructure/schema";

/** Nombres visibles de usuarios, para que otros módulos no consulten la tabla de Identity directamente. */
export async function getUserNames(tx: Tx, userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const rows = await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}
