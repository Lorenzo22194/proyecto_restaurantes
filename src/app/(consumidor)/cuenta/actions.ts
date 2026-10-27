"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedActor } from "@/modules/identity";
import { acceptInvitation } from "@/modules/restaurants";
import { runAction, type FormState } from "@/shared/http/action-result";
import { formString } from "@/shared/http/page-helpers";
import { currentRequestMeta } from "@/shared/http/request-meta";

export async function acceptInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireOnboardedActor("/cuenta");
  const result = await runAction(async () => acceptInvitation(actor, formString(formData, "memberId"), await currentRequestMeta()));
  if (!result.ok) return result;
  revalidatePath("/cuenta");
  redirect(`/panel/${result.data.restaurantId}`);
}
