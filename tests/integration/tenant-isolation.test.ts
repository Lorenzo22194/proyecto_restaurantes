// Escenarios 13 y 14 del plan (14 parcial: las comisiones llegan en la Fase D; aquí se cubre que el
// personal no puede cambiar configuración restringida ni escalar privilegios).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listRecentAuditEvents } from "@/modules/audit-security";
import {
  acceptInvitation,
  getRestaurantForMember,
  inviteMember,
  listPendingApplications,
  listTeam,
  reviewApplication,
} from "@/modules/restaurants";
import type { Actor } from "@/shared/kernel/actor";
import { closeTestPools, createUser, queryAs } from "../support/db";
import { approvedRestaurant } from "../support/fixtures";

let platformAdmin: Actor;
let ownerA: Actor;
let ownerB: Actor;
let cashierA: Actor;
let restaurantA: string;
let restaurantB: string;
let cashierMemberA: string;

beforeAll(async () => {
  platformAdmin = await createUser("admin-aislamiento", ["admin"]);
  ownerA = await createUser("dueno-a");
  ownerB = await createUser("dueno-b");
  cashierA = await createUser("cajero-a");
  restaurantA = await approvedRestaurant(ownerA, platformAdmin, "Restaurante A");
  restaurantB = await approvedRestaurant(ownerB, platformAdmin, "Restaurante B");
  cashierMemberA = (await inviteMember(ownerA, { restaurantId: restaurantA, email: cashierA.email, role: "cashier" })).memberId;
  await acceptInvitation(cashierA, cashierMemberA);
});
afterAll(closeTestPools);

describe("escenario 13: un usuario no accede a otro restaurante", () => {
  it("la capa de aplicación responde 404 sin revelar que el restaurante existe", async () => {
    await expect(getRestaurantForMember(ownerB, restaurantA)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(listTeam(ownerB, restaurantA)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(inviteMember(ownerB, { restaurantId: restaurantA, email: "x@prueba.test", role: "cashier" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(getRestaurantForMember(ownerB, "no-es-un-uuid")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("RLS devuelve 0 filas privadas aunque se consulte la base de datos directamente", async () => {
    const members = await queryAs(ownerB.userId, "select id from restaurant_members where restaurant_id = $1", [restaurantA]);
    expect(members.rowCount).toBe(0);

    const audit = await queryAs(ownerB.userId, "select id from audit_events where restaurant_id = $1", [restaurantA]);
    expect(audit.rowCount).toBe(0);

    // Los datos de B sí son visibles para su dueño.
    const own = await queryAs(ownerB.userId, "select id from restaurant_members where restaurant_id = $1", [restaurantB]);
    expect(own.rowCount).toBe(1);
  });

  it("RLS impide modificar o insertar datos de otro restaurante", async () => {
    const update = await queryAs(ownerB.userId, "update restaurants set display_name = 'Hackeado' where id = $1", [restaurantA]);
    expect(update.rowCount).toBe(0);

    await expect(
      queryAs(ownerB.userId, "insert into restaurant_locations (restaurant_id, name, address) values ($1, 'X', 'Calle falsa 123')", [restaurantA]),
    ).rejects.toThrow(/row-level security/);

    await expect(
      queryAs(
        ownerB.userId,
        "insert into restaurant_members (restaurant_id, invited_email, role, status, invited_by) values ($1, 'b@prueba.test', 'manager', 'invited', $2)",
        [restaurantA, ownerB.userId],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un restaurante pendiente no es visible para terceros ni sin sesión", async () => {
    const pendingOwner = await createUser("dueno-pendiente");
    const { applyForRestaurant } = await import("@/modules/restaurants");
    const { restaurantId } = await applyForRestaurant(pendingOwner, {
      displayName: "Pendiente",
      legalName: "Pendiente SAS",
      taxId: "123-4",
      currency: "COP",
      timezone: "America/Bogota",
      locationName: "Sede",
      locationAddress: "Calle 9 # 9-9",
    });
    expect((await queryAs(ownerB.userId, "select id from restaurants where id = $1", [restaurantId])).rowCount).toBe(0);
    expect((await queryAs(null, "select id from restaurants where id = $1", [restaurantId])).rowCount).toBe(0);
    // Uno aprobado sí es público.
    expect((await queryAs(null, "select id from restaurants where id = $1", [restaurantA])).rowCount).toBe(1);
  });

  it("sin sesión no se ve ningún dato privado", async () => {
    expect((await queryAs(null, "select id from restaurant_members")).rowCount).toBe(0);
    expect((await queryAs(null, "select id from audit_events")).rowCount).toBe(0);
    expect((await queryAs(null, "select user_id from platform_roles")).rowCount).toBe(0);
  });
});

describe("escenario 14 (parcial): el personal no cambia configuración restringida", () => {
  it("un cajero no puede editar el restaurante, aprobarlo ni cambiar su propio rol", async () => {
    const edit = await queryAs(cashierA.userId, "update restaurants set display_name = 'Cambio' where id = $1", [restaurantA]);
    expect(edit.rowCount).toBe(0);

    const promote = await queryAs(cashierA.userId, "update restaurant_members set role = 'owner' where id = $1", [cashierMemberA]);
    expect(promote.rowCount).toBe(0);

    await expect(reviewApplication(cashierA, { restaurantId: restaurantA, decision: "approve" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("un dueño no puede cambiar el estado de su propio restaurante (solo la plataforma)", async () => {
    await expect(queryAs(ownerA.userId, "update restaurants set status = 'suspended' where id = $1", [restaurantA])).rejects.toThrow(
      /solo un administrador/,
    );
  });

  it("nadie se otorga roles de plataforma a sí mismo", async () => {
    await expect(
      queryAs(ownerA.userId, "insert into platform_roles (user_id, role, granted_by) values ($1, 'admin', $1)", [ownerA.userId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("solo administración y soporte consultan la auditoría global y las solicitudes", async () => {
    await expect(listRecentAuditEvents(ownerA)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listPendingApplications(ownerA)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const events = await listRecentAuditEvents(platformAdmin);
    expect(events.length).toBeGreaterThan(0);
  });
});
