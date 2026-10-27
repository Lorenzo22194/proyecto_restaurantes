import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { recordAudit } from "@/modules/audit-security";
import { withActor } from "@/shared/db/client";
import { AppError, forbidden, isUniqueViolation, notFound } from "@/shared/errors";
import type { RequestMeta } from "@/shared/http/request-meta";
import { hasPlatformRole, type Actor } from "@/shared/kernel/actor";
import { enqueue } from "@/shared/outbox/outbox";
import { canTransition, slugify, type MemberRole, type RestaurantStatus } from "../domain/rules";
import { restaurantLocations, restaurantMembers, restaurants } from "../infrastructure/schema";
import { parseId, requireMemberRole } from "./access";

const supportedTimezones = new Set(Intl.supportedValuesOf("timeZone"));

export const restaurantApplicationInput = z.object({
  displayName: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(80, "Máximo 80 caracteres."),
  legalName: z.string().trim().min(2, "Escribe la razón social.").max(120, "Máximo 120 caracteres."),
  taxId: z
    .string()
    .trim()
    .min(3, "Escribe el identificador fiscal.")
    .max(30, "Máximo 30 caracteres.")
    .regex(/^[A-Za-z0-9.\- ]+$/, "Usa solo letras, números, puntos, guiones y espacios."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Usa el código ISO de 3 letras, por ejemplo COP o MXN."),
  timezone: z.string().refine((tz) => supportedTimezones.has(tz), "Elige una zona horaria válida."),
  locationName: z.string().trim().min(2, "Escribe el nombre de la sede.").max(80, "Máximo 80 caracteres."),
  locationAddress: z.string().trim().min(5, "Escribe la dirección.").max(200, "Máximo 200 caracteres."),
});

const SLUG_ATTEMPTS = 4;

/**
 * Solicitud de alta: crea el restaurante en revisión, a quien lo solicita como dueño y la primera
 * sede, todo en una transacción. Hasta que un administrador lo apruebe no es visible al público.
 */
export async function applyForRestaurant(
  actor: Actor,
  input: z.input<typeof restaurantApplicationInput>,
  meta?: RequestMeta,
): Promise<{ restaurantId: string; slug: string }> {
  const data = restaurantApplicationInput.parse(input);
  const baseSlug = slugify(data.displayName);

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    // Las solicitudes de otros no son visibles por RLS, así que la unicidad la decide la restricción.
    const slug = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 54)}-${randomSuffix()}`;
    try {
      return await withActor(actor.userId, async (tx) => {
        const [restaurant] = await tx
          .insert(restaurants)
          .values({
            slug,
            displayName: data.displayName,
            legalName: data.legalName,
            taxId: data.taxId,
            currency: data.currency,
            timezone: data.timezone,
            createdBy: actor.userId,
          })
          .returning({ id: restaurants.id });

        await tx.insert(restaurantMembers).values({
          restaurantId: restaurant.id,
          userId: actor.userId,
          invitedEmail: actor.email,
          role: "owner",
          status: "active",
          acceptedAt: new Date(),
        });

        const [location] = await tx
          .insert(restaurantLocations)
          .values({ restaurantId: restaurant.id, name: data.locationName, address: data.locationAddress })
          .returning({ id: restaurantLocations.id });

        await recordAudit(tx, {
          actorUserId: actor.userId,
          actorRole: "owner",
          restaurantId: restaurant.id,
          action: "restaurant.application_submitted",
          entityType: "restaurant",
          entityId: restaurant.id,
          after: { slug, ...data, firstLocationId: location.id, status: "pending" },
          meta,
        });

        return { restaurantId: restaurant.id, slug };
      });
    } catch (error) {
      if (isUniqueViolation(error, "restaurants_slug_unique")) continue;
      throw error;
    }
  }
  throw new AppError("CONFLICT", "No pudimos generar un identificador único. Prueba con otro nombre comercial.");
}

export type MyRestaurant = {
  id: string;
  displayName: string;
  status: RestaurantStatus;
  role: MemberRole;
};

export async function listMyRestaurants(actor: Actor): Promise<MyRestaurant[]> {
  return withActor(actor.userId, async (tx) => {
    const rows = await tx
      .select({
        id: restaurants.id,
        displayName: restaurants.displayName,
        status: restaurants.status,
        role: restaurantMembers.role,
      })
      .from(restaurantMembers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
      .where(and(eq(restaurantMembers.userId, actor.userId), eq(restaurantMembers.status, "active")))
      .orderBy(asc(restaurants.displayName));
    return rows.map((r) => ({ ...r, status: r.status as RestaurantStatus, role: r.role as MemberRole }));
  });
}

export type RestaurantForMember = {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  status: RestaurantStatus;
  currency: string;
  timezone: string;
  reviewNote: string | null;
  myRole: MemberRole;
  locations: { id: string; name: string; address: string; status: string }[];
};

export async function getRestaurantForMember(actor: Actor, restaurantIdRaw: string): Promise<RestaurantForMember> {
  const restaurantId = parseId(restaurantIdRaw);
  return withActor(actor.userId, async (tx) => {
    const myRole = await requireMemberRole(tx, actor, restaurantId);
    const [restaurant] = await tx
      .select({
        id: restaurants.id,
        slug: restaurants.slug,
        displayName: restaurants.displayName,
        legalName: restaurants.legalName,
        status: restaurants.status,
        currency: restaurants.currency,
        timezone: restaurants.timezone,
        reviewNote: restaurants.reviewNote,
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);
    if (!restaurant) throw notFound();

    const locations = await tx
      .select({
        id: restaurantLocations.id,
        name: restaurantLocations.name,
        address: restaurantLocations.address,
        status: restaurantLocations.status,
      })
      .from(restaurantLocations)
      .where(eq(restaurantLocations.restaurantId, restaurantId))
      .orderBy(asc(restaurantLocations.createdAt));

    return { ...restaurant, status: restaurant.status as RestaurantStatus, myRole, locations };
  });
}

export type PendingApplication = {
  id: string;
  displayName: string;
  legalName: string;
  taxId: string;
  currency: string;
  timezone: string;
  createdAt: Date;
  applicantEmail: string;
};

export async function listPendingApplications(actor: Actor): Promise<PendingApplication[]> {
  if (!hasPlatformRole(actor, "admin", "support")) throw forbidden();
  return withActor(actor.userId, (tx) =>
    tx
      .select({
        id: restaurants.id,
        displayName: restaurants.displayName,
        legalName: restaurants.legalName,
        taxId: restaurants.taxId,
        currency: restaurants.currency,
        timezone: restaurants.timezone,
        createdAt: restaurants.createdAt,
        applicantEmail: restaurantMembers.invitedEmail,
      })
      .from(restaurants)
      .innerJoin(
        restaurantMembers,
        and(
          eq(restaurantMembers.restaurantId, restaurants.id),
          eq(restaurantMembers.userId, restaurants.createdBy),
          eq(restaurantMembers.role, "owner"),
        ),
      )
      .where(eq(restaurants.status, "pending"))
      .orderBy(desc(restaurants.createdAt)),
  );
}

export const reviewInput = z
  .object({
    restaurantId: z.uuid(),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
  })
  .refine((v) => v.decision === "approve" || (v.note?.length ?? 0) >= 10, {
    path: ["note"],
    message: "Explica el motivo del rechazo (mínimo 10 caracteres). Se le mostrará al solicitante.",
  });

/** Aprobación o rechazo de una solicitud. Solo administradores de plataforma; queda auditado con motivo. */
export async function reviewApplication(actor: Actor, input: z.input<typeof reviewInput>, meta?: RequestMeta) {
  if (!hasPlatformRole(actor, "admin")) throw forbidden();
  const data = reviewInput.parse(input);
  const nextStatus: RestaurantStatus = data.decision === "approve" ? "approved" : "rejected";

  await withActor(actor.userId, async (tx) => {
    const [current] = await tx
      .select({ status: restaurants.status, displayName: restaurants.displayName, createdBy: restaurants.createdBy })
      .from(restaurants)
      .where(eq(restaurants.id, data.restaurantId))
      .for("update")
      .limit(1);
    if (!current) throw notFound();
    if (!canTransition(current.status as RestaurantStatus, nextStatus)) {
      throw new AppError("CONFLICT", "Esta solicitud ya fue revisada.");
    }

    const reviewedAt = new Date();
    await tx
      .update(restaurants)
      .set({ status: nextStatus, reviewedBy: actor.userId, reviewedAt, reviewNote: data.note || null })
      .where(eq(restaurants.id, data.restaurantId));

    await recordAudit(tx, {
      actorUserId: actor.userId,
      actorRole: "platform_admin",
      restaurantId: data.restaurantId,
      action: nextStatus === "approved" ? "restaurant.approved" : "restaurant.rejected",
      entityType: "restaurant",
      entityId: data.restaurantId,
      before: { status: current.status },
      after: { status: nextStatus },
      reason: data.note || null,
      meta,
    });

    const [founder] = await tx
      .select({ email: restaurantMembers.invitedEmail })
      .from(restaurantMembers)
      .where(and(eq(restaurantMembers.restaurantId, data.restaurantId), eq(restaurantMembers.userId, current.createdBy)))
      .limit(1);

    await enqueue(tx, "restaurant.reviewed", {
      restaurantId: data.restaurantId,
      restaurantName: current.displayName,
      ownerEmail: founder?.email ?? null,
      status: nextStatus,
      note: data.note || null,
    });
  });
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 5);
}
