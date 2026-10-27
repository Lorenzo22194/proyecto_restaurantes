"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { FormFeedback } from "@/shared/ui/form-feedback";
import { acceptInvitationAction } from "./actions";

export function AcceptInvitationButton({ memberId }: { memberId: string }) {
  const [state, action] = useActionState(acceptInvitationAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton pendingLabel="Aceptando…">Aceptar invitación</SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
