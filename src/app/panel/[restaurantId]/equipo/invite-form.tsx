"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { Checkbox, Field, Input, Select } from "@/shared/ui/field";
import { fieldError, FormFeedback, submittedValue } from "@/shared/ui/form-feedback";
import { Card } from "@/shared/ui/surface";
import { inviteMemberAction } from "../../actions";

type Props = {
  restaurantId: string;
  roles: { value: string; label: string }[];
  locations: { id: string; name: string }[];
};

export function InviteForm({ restaurantId, roles, locations }: Props) {
  const [state, action] = useActionState(inviteMemberAction, null);

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Invitar</h2>
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <Field
          label="Correo de la persona"
          hint="Deberá entrar con este mismo correo para aceptar."
          error={fieldError(state, "email")}
        >
          {(c) => <Input {...c} type="email" name="email" required autoComplete="off" defaultValue={submittedValue(state, "email")} />}
        </Field>
        <Field label="Rol" error={fieldError(state, "role")}>
          {(c) => (
            <Select {...c} name="role" defaultValue={submittedValue(state, "role", roles.at(-1)?.value)}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {locations.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Sedes donde trabajará</legend>
            {locations.map((location) => (
              <Checkbox key={location.id} name="locationIds" value={location.id} label={location.name} />
            ))}
          </fieldset>
        )}
        <FormFeedback state={state} success="Invitación enviada." />
        <SubmitButton pendingLabel="Enviando…">Enviar invitación</SubmitButton>
      </form>
    </Card>
  );
}
