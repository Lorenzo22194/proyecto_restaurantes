"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { drainOutbox } from "@/composition/outbox";
import { requireOnboardedActor } from "@/modules/identity";
import { applyForRestaurant, inviteMember, revokeMember } from "@/modules/restaurants";
import { runAction, withSubmittedValues, type FormState } from "@/shared/http/action-result";
import { formString } from "@/shared/http/page-helpers";
import { currentRequestMeta } from "@/shared/http/request-meta";

// Tras confirmar un cambio que encoló eventos, se intenta procesarlos cuando ya salió la respuesta.
// Si falla, el cron de /api/internal/outbox los reintenta.
function processQueueAfterResponse() {
  after(async () => {
    await drainOutbox().catch((error) => console.error("[outbox] fallo al procesar tras la respuesta", error));
  });
}

export async function applyForRestaurantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireOnboardedActor("/panel/alta");
  const result = await runAction(async () =>
    applyForRestaurant(
      actor,
      {
        displayName: formString(formData, "displayName"),
        legalName: formString(formData, "legalName"),
        taxId: formString(formData, "taxId"),
        currency: formString(formData, "currency"),
        timezone: formString(formData, "timezone"),
        locationName: formString(formData, "locationName"),
        locationAddress: formString(formData, "locationAddress"),
      },
      await currentRequestMeta(),
    ),
  );
  if (!result.ok) return withSubmittedValues(result, formData);
  revalidatePath("/panel");
  redirect(`/panel/${result.data.restaurantId}`);
}

export async function inviteMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const restaurantId = formString(formData, "restaurantId");
  const actor = await requireOnboardedActor(`/panel/${restaurantId}/equipo`);
  const result = await runAction(async () =>
    inviteMember(
      actor,
      {
        restaurantId,
        email: formString(formData, "email"),
        role: formString(formData, "role") as "manager" | "cashier",
        locationIds: formData.getAll("locationIds").filter((v): v is string => typeof v === "string"),
      },
      await currentRequestMeta(),
    ),
  );
  if (!result.ok) return withSubmittedValues(result, formData);
  processQueueAfterResponse();
  revalidatePath(`/panel/${restaurantId}/equipo`);
  return result;
}

export async function revokeMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const restaurantId = formString(formData, "restaurantId");
  const actor = await requireOnboardedActor(`/panel/${restaurantId}/equipo`);
  const result = await runAction(async () =>
    revokeMember(
      actor,
      { restaurantId, memberId: formString(formData, "memberId"), reason: formString(formData, "reason") },
      await currentRequestMeta(),
    ),
  );
  if (result.ok) revalidatePath(`/panel/${restaurantId}/equipo`);
  return result;
}
