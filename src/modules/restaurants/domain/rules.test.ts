import { describe, expect, it } from "vitest";
import { canInvite, canTransition, invitableRoles, normalizeEmail, slugify } from "./rules";

describe("slugify", () => {
  it("quita tildes, eñes y signos", () => {
    expect(slugify("Café La Ñapa")).toBe("cafe-la-napa");
    expect(slugify("  Burger & Co.  ")).toBe("burger-co");
  });

  it("usa un valor por defecto si no queda ningún carácter válido", () => {
    expect(slugify("!!!")).toBe("restaurante");
  });

  it("limita la longitud sin dejar un guion al final", () => {
    const slug = slugify("a".repeat(59) + " bbbbb");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("invitaciones", () => {
  it("el dueño invita gerentes y cajeros, nunca dueños", () => {
    expect(canInvite("owner", "manager")).toBe(true);
    expect(canInvite("owner", "cashier")).toBe(true);
    expect(canInvite("owner", "owner")).toBe(false);
  });

  it("el gerente solo invita cajeros y el cajero no invita a nadie", () => {
    expect(invitableRoles("manager")).toEqual(["cashier"]);
    expect(invitableRoles("cashier")).toEqual([]);
    expect(canInvite("cashier", "cashier")).toBe(false);
  });
});

describe("transiciones de estado", () => {
  it("una solicitud pendiente se aprueba o rechaza", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
  });

  it("no hay vuelta atrás desde rechazado o cerrado", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("closed", "approved")).toBe(false);
    expect(canTransition("approved", "pending")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizeEmail("  Ana@Ejemplo.COM ")).toBe("ana@ejemplo.com");
  });
});
