import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/shared/db/client";
import { notFound } from "@/shared/errors";
import type { Actor } from "@/shared/kernel/actor";
import type { MemberRole } from "../domain/rules";
import { restaurantMembers } from "../infrastructure/schema";

const uuid = z.uuid();

/** Un id mal formado se trata igual que uno inexistente: 404, sin errores de base de datos. */
export function parseId(id: string): string {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

/**
 * Rol activo del actor en el restaurante. Si no es miembro responde 404 (no 403) para no revelar
 * qué restaurantes existen. RLS aplica el mismo criterio en la base de datos.
 */
export async function requireMemberRole(tx: Tx, actor: Actor, restaurantId: string): Promise<MemberRole> {
  const [membership] = await tx
    .select({ role: restaurantMembers.role })
    .from(restaurantMembers)
    .where(
      and(
        eq(restaurantMembers.restaurantId, restaurantId),
        eq(restaurantMembers.userId, actor.userId),
        eq(restaurantMembers.status, "active"),
      ),
    )
    .limit(1);
  if (!membership) throw notFound();
  return membership.role as MemberRole;
}
