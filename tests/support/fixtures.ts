import { applyForRestaurant, reviewApplication } from "@/modules/restaurants";
import type { Actor } from "@/shared/kernel/actor";

export const validApplication = {
  displayName: "Hamburguesas de Prueba",
  legalName: "Hamburguesas de Prueba S.A.S.",
  taxId: "900123456-7",
  currency: "COP",
  timezone: "America/Bogota",
  locationName: "Sede Centro",
  locationAddress: "Calle 1 # 2-3",
};

export async function approvedRestaurant(owner: Actor, platformAdmin: Actor, displayName = "Restaurante de Prueba") {
  const { restaurantId } = await applyForRestaurant(owner, { ...validApplication, displayName });
  await reviewApplication(platformAdmin, { restaurantId, decision: "approve" });
  return restaurantId;
}
