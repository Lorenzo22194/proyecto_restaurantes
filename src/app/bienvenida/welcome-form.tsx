"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/shared/ui/button";
import { Checkbox, Field, Input } from "@/shared/ui/field";
import { fieldError, FormFeedback, submittedValue } from "@/shared/ui/form-feedback";
import { acceptTermsAction } from "./actions";

export function WelcomeForm({ nextPath, defaultName }: { nextPath: string; defaultName: string }) {
  const [state, action] = useActionState(acceptTermsAction, null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={nextPath} />
      <Field label="¿Cómo te llamamos?" hint="Lo verá el personal del restaurante al registrar tus compras." error={fieldError(state, "displayName")}>
        {(control) => <Input {...control} name="displayName" autoComplete="given-name" defaultValue={submittedValue(state, "displayName", defaultName)} required maxLength={60} />}
      </Field>

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-sm">
        <p className="font-semibold">Uso de inteligencia artificial</p>
        <p className="text-coffee-muted">
          Cuando dejes un comentario privado sobre una visita, un sistema de IA lo analiza para resumirlo al restaurante y
          decidir si suma puntos por aportar detalles útiles. Nunca premia ni castiga que la opinión sea positiva o negativa,
          y siempre puedes pedir que una persona revise el resultado.
        </p>
        <a href="/condiciones" target="_blank" className="font-semibold text-wine underline underline-offset-2">
          Leer condiciones y aviso de privacidad
        </a>
      </div>

      <Checkbox
        name="acceptTerms"
        defaultChecked={submittedValue(state, "acceptTerms") === "on"}
        label="Acepto las condiciones del servicio y el aviso de privacidad."
        error={fieldError(state, "acceptTerms")}
      />
      <Checkbox
        name="acceptAiNotice"
        defaultChecked={submittedValue(state, "acceptAiNotice") === "on"}
        label="Entiendo cómo se usa la IA para analizar mis comentarios."
        error={fieldError(state, "acceptAiNotice")}
      />

      <FormFeedback state={state} />
      <SubmitButton size="lg" fullWidth pendingLabel="Guardando…">
        Continuar
      </SubmitButton>
    </form>
  );
}
