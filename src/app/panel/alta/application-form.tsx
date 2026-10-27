"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/field";
import { fieldError, FormFeedback, submittedValue } from "@/shared/ui/form-feedback";
import { Card } from "@/shared/ui/surface";
import { applyForRestaurantAction } from "../actions";

const CURRENCY_SUGGESTIONS = ["COP", "MXN", "USD", "EUR", "PEN", "CLP", "ARS"];

export function ApplicationForm({ timezones }: { timezones: string[] }) {
  const [state, action] = useActionState(applyForRestaurantAction, null);
  const err = (field: string) => fieldError(state, field);
  const val = (field: string) => submittedValue(state, field);

  return (
    <form action={action} className="grid max-w-3xl gap-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-display text-xl font-semibold sm:col-span-2">Datos del negocio</h2>
        <Field label="Nombre comercial" hint="Así lo verán los clientes." error={err("displayName")}>
          {(c) => <Input {...c} name="displayName" defaultValue={val("displayName")} required maxLength={80} />}
        </Field>
        <Field label="Razón social" error={err("legalName")}>
          {(c) => <Input {...c} name="legalName" defaultValue={val("legalName")} required maxLength={120} autoComplete="organization" />}
        </Field>
        <Field label="Identificador fiscal" hint="NIT, RFC, CUIT, RUC u otro." error={err("taxId")}>
          {(c) => <Input {...c} name="taxId" defaultValue={val("taxId")} required maxLength={30} />}
        </Field>
        <Field label="Moneda" hint="Código ISO de 3 letras." error={err("currency")}>
          {(c) => (
            <>
              <Input {...c} name="currency" defaultValue={val("currency")} required maxLength={3} list="currency-options" className="uppercase" />
              <datalist id="currency-options">
                {CURRENCY_SUGGESTIONS.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Zona horaria" error={err("timezone")}>
          {(c) => (
            <Select {...c} name="timezone" required defaultValue={val("timezone")}>
              <option value="" disabled>
                Elige la zona horaria
              </option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-display text-xl font-semibold sm:col-span-2">Primera sede</h2>
        <Field label="Nombre de la sede" error={err("locationName")}>
          {(c) => <Input {...c} name="locationName" defaultValue={val("locationName")} required maxLength={80} placeholder="Sede principal" />}
        </Field>
        <Field label="Dirección" error={err("locationAddress")}>
          {(c) => <Input {...c} name="locationAddress" defaultValue={val("locationAddress")} required maxLength={200} autoComplete="street-address" />}
        </Field>
      </Card>

      <FormFeedback state={state} />
      <div>
        <SubmitButton size="lg" pendingLabel="Enviando solicitud…">
          Enviar solicitud
        </SubmitButton>
      </div>
    </form>
  );
}
