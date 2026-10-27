import "server-only";
import { eq } from "drizzle-orm";
import { isPlatformRole, type Actor } from "@/shared/kernel/actor";
import { withActor } from "@/shared/db/client";
import { getAuth } from "../infrastructure/auth";
import { platformRoles, users } from "../infrastructure/schema";

/**
 * Construye el actor a partir de la cookie de sesión. Devuelve null si no hay sesión válida o si la
 * cuenta ya no está activa (la suspensión surte efecto aunque la sesión siga vigente).
 */
export async function resolveActor(requestHeaders: Headers): Promise<Actor | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return loadActor(session.user.id);
}

export async function loadActor(userId: string): Promise<Actor | null> {
  return withActor(userId, async (tx) => {
    const [user] = await tx
      .select({ id: users.id, email: users.email, name: users.name, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.status !== "active") return null;

    const roles = await tx.select({ role: platformRoles.role }).from(platformRoles).where(eq(platformRoles.userId, userId));
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      platformRoles: roles.map((r) => r.role).filter(isPlatformRole),
    };
  });
}
