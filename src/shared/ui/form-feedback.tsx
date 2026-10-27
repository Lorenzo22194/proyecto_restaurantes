import type { FormState } from "@/shared/http/action-result";
import { Alert } from "./surface";

/** Mensaje general de un formulario de servidor; los errores por campo se muestran en cada Field. */
export function FormFeedback({ state, success }: { state: FormState; success?: string }) {
  if (!state) return null;
  if (state.ok) return success ? <Alert tone="success" title={success} /> : null;
  return <Alert tone="error" title={state.message} />;
}

export function fieldError(state: FormState, field: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[field] : undefined;
}

/** Valor enviado en el último intento fallido, para no obligar a reescribir el formulario. */
export function submittedValue(state: FormState, field: string, fallback = ""): string {
  return state && !state.ok ? (state.values?.[field] ?? fallback) : fallback;
}
