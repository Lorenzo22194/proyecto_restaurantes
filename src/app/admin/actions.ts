"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { drainOutbox } from "@/composition/outbox";
import { requirePlatformActor } from "@/modules/identity";
import { reviewApplication } from "@/modules/restaurants";
import { runAction, withSubmittedValues, type FormState } from "@/shared/http/action-result";
import { formString } from "@/shared/http/page-helpers";
import { currentRequestMeta } from "@/shared/http/request-meta";

export async function reviewApplicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePlatformActor("/admin/restaurantes", ["admin"]);
  const result = await runAction(async () =>
    reviewApplication(
      actor,
      {
        restaurantId: formString(formData, "restaurantId"),
        decision: formString(formData, "decision") as "approve" | "reject",
        note: formString(formData, "note") || undefined,
      },
      await currentRequestMeta(),
    ),
  );
  if (!result.ok) return withSubmittedValues(result, formData);
  after(async () => {
    await drainOutbox().catch((error) => console.error("[outbox] fallo al procesar tras la respuesta", error));
  });
  revalidatePath("/admin/restaurantes");
  return result;
}
