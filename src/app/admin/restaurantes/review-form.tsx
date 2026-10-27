"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { Field, Textarea } from "@/shared/ui/field";
import { fieldError, FormFeedback, submittedValue } from "@/shared/ui/form-feedback";
import { reviewApplicationAction } from "../actions";

export function ReviewForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState(reviewApplicationAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line pt-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <Field label="Nota para el solicitante" hint="Obligatoria si rechazas. Se le mostrará al dueño." error={fieldError(state, "note")}>
        {(c) => <Textarea {...c} name="note" maxLength={500} rows={2} defaultValue={submittedValue(state, "note")} />}
      </Field>
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approve" pendingLabel="Guardando…">
          Aprobar
        </SubmitButton>
        <SubmitButton name="decision" value="reject" variant="danger" pendingLabel="Guardando…">
          Rechazar
        </SubmitButton>
      </div>
    </form>
  );
}
