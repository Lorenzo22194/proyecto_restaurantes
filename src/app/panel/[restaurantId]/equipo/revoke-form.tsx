"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/field";
import { fieldError, FormFeedback } from "@/shared/ui/form-feedback";
import { revokeMemberAction } from "../../actions";

/** Revocar exige motivo: queda en la auditoría del restaurante. */
export function RevokeForm({ restaurantId, memberId, pending }: { restaurantId: string; memberId: string; pending: boolean }) {
  const [state, action] = useActionState(revokeMemberAction, null);
  const label = pending ? "Cancelar invitación" : "Revocar acceso";

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-error">{label}</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <input type="hidden" name="memberId" value={memberId} />
        <Field label="Motivo" error={fieldError(state, "reason")}>
          {(c) => <Input {...c} name="reason" required minLength={5} maxLength={300} />}
        </Field>
        <FormFeedback state={state} />
        <SubmitButton variant="danger" pendingLabel="Guardando…">
          Confirmar
        </SubmitButton>
      </form>
    </details>
  );
}
