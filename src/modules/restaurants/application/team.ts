import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { recordAudit } from "@/modules/audit-security";
import { getUserNames } from "@/modules/identity";
import { withActor } from "@/shared/db/client";
import { AppError, forbidden, isUniqueViolation, notFound } from "@/shared/errors";
import type { RequestMeta } from "@/shared/http/request-meta";
import type { Actor } from "@/shared/kernel/actor";
import { enqueue } from "@/shared/outbox/outbox";
import { canInvite, canManageTeam, MEMBER_ROLES, normalizeEmail, type MemberRole } from "../domain/rules";
import { memberLocations, restaurantLocations, restaurantMembers, restaurants } from "../infrastructure/schema";
import { parseId, requireMemberRole } from "./access";

export const inviteMemberInput = z.object({
  restaurantId: z.uuid(),
  email: z.email("Escribe un correo válido.").transform(normalizeEmail),
  role: z.enum(["manager", "cashier"], { error: "Elige un rol." }),
  locationIds: z.array(z.uuid()).max(50).default([]),
});

export async function inviteMember(actor: Actor, input: z.input<typeof inviteMemberInput>, meta?: RequestMeta) {
  const data = inviteMemberInput.parse(input);
  if (data.email === actor.email) {
    throw new AppError("VALIDATION", "No puedes invitarte a ti mismo.", { email: "Usa el correo de otra persona." });
  }

  try {
    return await withActor(actor.userId, async (tx) => {
      const myRole = await requireMemberRole(tx, actor, data.restaurantId);
      if (!canInvite(myRole, data.role)) throw forbidden("Tu rol no permite invitar a un " + roleName(data.role) + ".");

      // invited_email coincide con el correo verificado de quien aceptó (la aceptación lo exige).
      const [existing] = await tx
        .select({ id: restaurantMembers.id })
        .from(restaurantMembers)
        .where(
          and(
            eq(restaurantMembers.restaurantId, data.restaurantId),
            eq(restaurantMembers.status, "active"),
            eq(restaurantMembers.invitedEmail, data.email),
          ),
        )
        .limit(1);
      if (existing) {
        throw new AppError("CONFLICT", "Esa persona ya forma parte del equipo.", { email: "Ya es miembro activo." });
      }

      if (data.locationIds.length > 0) {
        const valid = await tx
          .select({ id: restaurantLocations.id })
          .from(restaurantLocations)
          .where(and(eq(restaurantLocations.restaurantId, data.restaurantId), inArray(restaurantLocations.id, data.locationIds)));
        if (valid.length !== new Set(data.locationIds).size) throw new AppError("VALIDATION", "Alguna sede no es válida.");
      }

      const [member] = await tx
        .insert(restaurantMembers)
        .values({
          restaurantId: data.restaurantId,
          invitedEmail: data.email,
          role: data.role,
          status: "invited",
          invitedBy: actor.userId,
        })
        .returning({ id: restaurantMembers.id });

      if (data.locationIds.length > 0) {
        await tx
          .insert(memberLocations)
          .values(data.locationIds.map((locationId) => ({ memberId: member.id, locationId, restaurantId: data.restaurantId })));
      }

      const [restaurant] = await tx
        .select({ displayName: restaurants.displayName })
        .from(restaurants)
        .where(eq(restaurants.id, data.restaurantId))
        .limit(1);

      await recordAudit(tx, {
        actorUserId: actor.userId,
        actorRole: myRole,
        restaurantId: data.restaurantId,
        action: "member.invited",
        entityType: "restaurant_member",
        entityId: member.id,
        after: { email: data.email, role: data.role, locationIds: data.locationIds },
        meta,
      });

      await enqueue(tx, "member.invited", {
        memberId: member.id,
        email: data.email,
        role: data.role,
        restaurantName: restaurant?.displayName ?? "",
      });

      return { memberId: member.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, "restaurant_members_pending_invite_uq")) {
      throw new AppError("CONFLICT", "Ya hay una invitación pendiente para ese correo.", { email: "Invitación pendiente." });
    }
    throw error;
  }
}

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  status: "invited" | "active" | "revoked";
  locationIds: string[];
  isMe: boolean;
};

export async function listTeam(actor: Actor, restaurantIdRaw: string): Promise<{ myRole: MemberRole; members: TeamMember[] }> {
  const restaurantId = parseId(restaurantIdRaw);
  return withActor(actor.userId, async (tx) => {
    const myRole = await requireMemberRole(tx, actor, restaurantId);
    const rows = await tx
      .select({
        id: restaurantMembers.id,
        email: restaurantMembers.invitedEmail,
        userId: restaurantMembers.userId,
        role: restaurantMembers.role,
        status: restaurantMembers.status,
      })
      .from(restaurantMembers)
      .where(eq(restaurantMembers.restaurantId, restaurantId))
      .orderBy(asc(restaurantMembers.createdAt));
    const names = await getUserNames(
      tx,
      rows.flatMap((r) => (r.userId ? [r.userId] : [])),
    );

    const assignments = await tx
      .select({ memberId: memberLocations.memberId, locationId: memberLocations.locationId })
      .from(memberLocations)
      .where(eq(memberLocations.restaurantId, restaurantId));

    const members = rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: (row.userId && names.get(row.userId)) || null,
      role: row.role as MemberRole,
      status: row.status as TeamMember["status"],
      locationIds: assignments.filter((a) => a.memberId === row.id).map((a) => a.locationId),
      isMe: row.userId === actor.userId,
    }));
    return { myRole, members };
  });
}

export type PendingInvitation = { id: string; restaurantName: string; role: MemberRole };

export async function listMyInvitations(actor: Actor): Promise<PendingInvitation[]> {
  return withActor(actor.userId, async (tx) => {
    const rows = await tx
      .select({ id: restaurantMembers.id, restaurantName: restaurants.displayName, role: restaurantMembers.role })
      .from(restaurantMembers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
      .where(and(eq(restaurantMembers.status, "invited"), eq(restaurantMembers.invitedEmail, actor.email)))
      .orderBy(asc(restaurantMembers.createdAt));
    return rows.map((r) => ({ ...r, role: r.role as MemberRole }));
  });
}

/** Acepta una invitación dirigida al correo verificado del actor. */
export async function acceptInvitation(actor: Actor, memberIdRaw: string, meta?: RequestMeta): Promise<{ restaurantId: string }> {
  const memberId = parseId(memberIdRaw);
  try {
    return await withActor(actor.userId, async (tx) => {
      const [accepted] = await tx
        .update(restaurantMembers)
        .set({ userId: actor.userId, status: "active", acceptedAt: new Date() })
        .where(
          and(
            eq(restaurantMembers.id, memberId),
            eq(restaurantMembers.status, "invited"),
            eq(restaurantMembers.invitedEmail, actor.email),
          ),
        )
        .returning({ restaurantId: restaurantMembers.restaurantId, role: restaurantMembers.role });
      if (!accepted) throw notFound("La invitación no existe o ya no está disponible.");

      await recordAudit(tx, {
        actorUserId: actor.userId,
        actorRole: accepted.role,
        restaurantId: accepted.restaurantId,
        action: "member.invitation_accepted",
        entityType: "restaurant_member",
        entityId: memberId,
        before: { status: "invited" },
        after: { status: "active", userId: actor.userId },
        meta,
      });
      return { restaurantId: accepted.restaurantId };
    });
  } catch (error) {
    if (isUniqueViolation(error, "restaurant_members_restaurant_user_uq")) {
      throw new AppError("CONFLICT", "Ya formas parte del equipo de este restaurante.");
    }
    throw error;
  }
}

export const revokeMemberInput = z.object({
  restaurantId: z.uuid(),
  memberId: z.uuid(),
  reason: z.string().trim().min(5, "Indica el motivo (mínimo 5 caracteres).").max(300),
});

/** Revoca un acceso o cancela una invitación. Solo el dueño; nunca sobre sí mismo ni el último dueño. */
export async function revokeMember(actor: Actor, input: z.input<typeof revokeMemberInput>, meta?: RequestMeta) {
  const data = revokeMemberInput.parse(input);
  await withActor(actor.userId, async (tx) => {
    const myRole = await requireMemberRole(tx, actor, data.restaurantId);
    if (!canManageTeam(myRole)) throw forbidden("Solo el dueño puede revocar accesos.");

    const [target] = await tx
      .select({ userId: restaurantMembers.userId, role: restaurantMembers.role, status: restaurantMembers.status })
      .from(restaurantMembers)
      .where(and(eq(restaurantMembers.id, data.memberId), eq(restaurantMembers.restaurantId, data.restaurantId)))
      .for("update")
      .limit(1);
    if (!target) throw notFound();
    if (target.status === "revoked") throw new AppError("CONFLICT", "Ese acceso ya estaba revocado.");
    if (target.userId === actor.userId) throw new AppError("VALIDATION", "No puedes revocar tu propio acceso.");
    if (target.role === "owner") throw forbidden("El acceso de un dueño solo lo cambia soporte de la plataforma.");

    await tx
      .update(restaurantMembers)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(eq(restaurantMembers.id, data.memberId));

    await recordAudit(tx, {
      actorUserId: actor.userId,
      actorRole: myRole,
      restaurantId: data.restaurantId,
      action: target.status === "invited" ? "member.invitation_cancelled" : "member.revoked",
      entityType: "restaurant_member",
      entityId: data.memberId,
      before: { status: target.status, role: target.role },
      after: { status: "revoked" },
      reason: data.reason,
      meta,
    });
  });
}

function roleName(role: (typeof MEMBER_ROLES)[number]) {
  return role === "manager" ? "gerente" : role === "cashier" ? "cajero" : "dueño";
}
