import "server-only";
import { desc } from "drizzle-orm";
import { hasPlatformRole, type Actor } from "@/shared/kernel/actor";
import { withActor, type Tx } from "@/shared/db/client";
import { forbidden } from "@/shared/errors";
import type { RequestMeta } from "@/shared/http/request-meta";
import { auditEvents } from "../infrastructure/schema";

export type AuditEventInput = {
  actorUserId: string | null;
  /** Rol con el que actuó: rol de plataforma, rol en el restaurante, "user" o "system". */
  actorRole: string;
  restaurantId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  meta?: RequestMeta;
};

/** Registra la auditoría dentro de la misma transacción que el cambio: o se guardan ambos o ninguno. */
export async function recordAudit(tx: Tx, event: AuditEventInput): Promise<void> {
  await tx.insert(auditEvents).values({
    actorUserId: event.actorUserId,
    actorRole: event.actorRole,
    restaurantId: event.restaurantId ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    before: event.before ?? null,
    after: event.after ?? null,
    reason: event.reason ?? null,
    requestId: event.meta?.requestId ?? null,
    ipHash: event.meta?.ipHash ?? null,
  });
}

export type AuditEventView = {
  id: number;
  occurredAt: Date;
  actorUserId: string | null;
  actorRole: string;
  restaurantId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
};

export async function listRecentAuditEvents(actor: Actor, limit = 100): Promise<AuditEventView[]> {
  if (!hasPlatformRole(actor, "admin", "support")) throw forbidden();
  return withActor(actor.userId, (tx) =>
    tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        actorUserId: auditEvents.actorUserId,
        actorRole: auditEvents.actorRole,
        restaurantId: auditEvents.restaurantId,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        reason: auditEvents.reason,
      })
      .from(auditEvents)
      .orderBy(desc(auditEvents.id))
      .limit(Math.min(Math.max(limit, 1), 500)),
  );
}
