"use server";

import { redirect } from "next/navigation";
import { acceptTerms, requireActor } from "@/modules/identity";
import { runAction, withSubmittedValues, type FormState } from "@/shared/http/action-result";
import { formString } from "@/shared/http/page-helpers";
import { currentRequestMeta } from "@/shared/http/request-meta";
import { safeNextPath } from "@/shared/http/safe-redirect";

export async function acceptTermsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor("/bienvenida");
  const result = await runAction(async () =>
    acceptTerms(
      actor,
      {
        displayName: formString(formData, "displayName"),
        acceptTerms: formData.get("acceptTerms") === "on",
        acceptAiNotice: formData.get("acceptAiNotice") === "on",
      },
      await currentRequestMeta(),
    ),
  );
  if (result.ok) redirect(safeNextPath(formString(formData, "next")));
  return withSubmittedValues(result, formData);
}
