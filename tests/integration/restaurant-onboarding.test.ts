import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  acceptInvitation,
  applyForRestaurant,
  getRestaurantForMember,
  inviteMember,
  listMyInvitations,
  listMyRestaurants,
  listPendingApplications,
  listTeam,
  reviewApplication,
  revokeMember,
} from "@/modules/restaurants";
import { AppError } from "@/shared/errors";
import type { Actor } from "@/shared/kernel/actor";
import { admin, closeTestPools, createUser } from "../support/db";
import { validApplication } from "../support/fixtures";

let platformAdmin: Actor;

beforeAll(async () => {
  platformAdmin = await createUser("admin", ["admin"]);
});
afterAll(closeTestPools);

async function auditActions(restaurantId: string): Promise<string[]> {
  const { rows } = await admin().query<{ action: string }>(
    "select action from audit_events where restaurant_id = $1 order by id",
    [restaurantId],
  );
  return rows.map((r) => r.action);
}

describe("alta de restaurante", () => {
  it("crea la solicitud en revisión con su dueño, su primera sede y auditoría", async () => {
    const owner = await createUser("dueno");
    const { restaurantId, slug } = await applyForRestaurant(owner, validApplication, { requestId: "req-1" });

    expect(slug).toMatch(/^hamburguesas-de-prueba/);
    const restaurant = await getRestaurantForMember(owner, restaurantId);
    expect(restaurant.status).toBe("pending");
    expect(restaurant.myRole).toBe("owner");
    expect(restaurant.locations).toHaveLength(1);
    expect(await auditActions(restaurantId)).toEqual(["restaurant.application_submitted"]);
  });

  it("genera un slug distinto si el nombre ya existe", async () => {
    const [a, b] = [await createUser("dueno-a"), await createUser("dueno-b")];
    const first = await applyForRestaurant(a, { ...validApplication, displayName: "Nombre Repetido" });
    const second = await applyForRestaurant(b, { ...validApplication, displayName: "Nombre Repetido" });
    expect(first.slug).toBe("nombre-repetido");
    expect(second.slug).not.toBe(first.slug);
  });

  it("valida los datos en el servidor", async () => {
    const owner = await createUser("dueno-invalido");
    await expect(applyForRestaurant(owner, { ...validApplication, currency: "pesos", timezone: "Marte/Olympus" })).rejects.toThrow();
  });

  it("el administrador aprueba y la decisión queda auditada; no se puede revisar dos veces", async () => {
    const owner = await createUser("dueno-aprobado");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);

    const pending = await listPendingApplications(platformAdmin);
    expect(pending.map((p) => p.id)).toContain(restaurantId);

    await reviewApplication(platformAdmin, { restaurantId, decision: "approve" });
    expect((await getRestaurantForMember(owner, restaurantId)).status).toBe("approved");
    expect(await auditActions(restaurantId)).toEqual(["restaurant.application_submitted", "restaurant.approved"]);

    await expect(reviewApplication(platformAdmin, { restaurantId, decision: "reject", note: "Motivo de prueba largo" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rechazar exige un motivo", async () => {
    const owner = await createUser("dueno-rechazo");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    await expect(reviewApplication(platformAdmin, { restaurantId, decision: "reject" })).rejects.toThrow();
    await reviewApplication(platformAdmin, { restaurantId, decision: "reject", note: "Documentos ilegibles" });
    const restaurant = await getRestaurantForMember(owner, restaurantId);
    expect(restaurant.status).toBe("rejected");
    expect(restaurant.reviewNote).toBe("Documentos ilegibles");
  });

  it("solo un administrador de plataforma puede revisar solicitudes", async () => {
    const owner = await createUser("dueno-sin-permiso");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    await expect(reviewApplication(owner, { restaurantId, decision: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const support = await createUser("soporte", ["support"]);
    await expect(reviewApplication(support, { restaurantId, decision: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("equipo del restaurante", () => {
  it("el dueño invita a un cajero, que acepta con su correo y queda activo", async () => {
    const owner = await createUser("dueno-equipo");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    const { locations } = await getRestaurantForMember(owner, restaurantId);
    const cashier = await createUser("cajero");

    const { memberId } = await inviteMember(owner, {
      restaurantId,
      email: cashier.email.toUpperCase(),
      role: "cashier",
      locationIds: [locations[0].id],
    });

    const invitations = await listMyInvitations(cashier);
    expect(invitations).toEqual([{ id: memberId, restaurantName: validApplication.displayName, role: "cashier" }]);

    await acceptInvitation(cashier, memberId);
    const mine = await listMyRestaurants(cashier);
    expect(mine).toMatchObject([{ id: restaurantId, role: "cashier" }]);

    const team = await listTeam(owner, restaurantId);
    const member = team.members.find((m) => m.id === memberId);
    expect(member).toMatchObject({ status: "active", role: "cashier", name: "cajero", locationIds: [locations[0].id] });
    expect(await auditActions(restaurantId)).toEqual([
      "restaurant.application_submitted",
      "member.invited",
      "member.invitation_accepted",
    ]);
  });

  it("nadie acepta una invitación dirigida a otro correo", async () => {
    const owner = await createUser("dueno-otro-correo");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    const invited = await createUser("invitado");
    const intruder = await createUser("intruso");
    const { memberId } = await inviteMember(owner, { restaurantId, email: invited.email, role: "manager" });

    expect(await listMyInvitations(intruder)).toEqual([]);
    await expect(acceptInvitation(intruder, memberId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("no permite invitaciones duplicadas ni invitar a quien ya es miembro", async () => {
    const owner = await createUser("dueno-duplicado");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    const person = await createUser("persona");
    await inviteMember(owner, { restaurantId, email: person.email, role: "cashier" });
    await expect(inviteMember(owner, { restaurantId, email: person.email, role: "cashier" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(inviteMember(owner, { restaurantId, email: owner.email, role: "manager" })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("el gerente solo invita cajeros; el cajero no invita ni revoca", async () => {
    const owner = await createUser("dueno-roles");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    const manager = await createUser("gerente");
    const cashier = await createUser("cajero-roles");

    await acceptInvitation(manager, (await inviteMember(owner, { restaurantId, email: manager.email, role: "manager" })).memberId);
    const cashierInvite = await inviteMember(manager, { restaurantId, email: cashier.email, role: "cashier" });
    await acceptInvitation(cashier, cashierInvite.memberId);

    await expect(inviteMember(manager, { restaurantId, email: "otro-gerente@prueba.test", role: "manager" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(inviteMember(cashier, { restaurantId, email: "otro-cajero@prueba.test", role: "cashier" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      revokeMember(manager, { restaurantId, memberId: cashierInvite.memberId, reason: "Prueba de permisos" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("el dueño revoca un acceso con motivo; el revocado pierde acceso de inmediato", async () => {
    const owner = await createUser("dueno-revoca");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    const cashier = await createUser("cajero-revocado");
    const { memberId } = await inviteMember(owner, { restaurantId, email: cashier.email, role: "cashier" });
    await acceptInvitation(cashier, memberId);

    await revokeMember(owner, { restaurantId, memberId, reason: "Ya no trabaja aquí" });
    await expect(getRestaurantForMember(cashier, restaurantId)).rejects.toBeInstanceOf(AppError);
    expect(await listMyRestaurants(cashier)).toEqual([]);

    const ownerMember = (await listTeam(owner, restaurantId)).members.find((m) => m.isMe)!;
    await expect(revokeMember(owner, { restaurantId, memberId: ownerMember.id, reason: "Me revoco" })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});
