import "server-only";
import { z } from "zod";
import { AppError } from "@/shared/errors";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: AppError["code"]; message: string; fieldErrors?: Record<string, string> };

/**
 * Estado de formularios con `useActionState`. En caso de error devuelve los valores enviados, porque
 * React restablece el formulario al terminar la acción y se perderían.
 */
export type FormState = (ActionResult<unknown> & { values?: Record<string, string> }) | null;

export function withSubmittedValues(result: ActionResult<unknown>, formData: FormData): FormState {
  if (result.ok) return result;
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return { ...result, values };
}

/**
 * Ejecuta un caso de uso y traduce los errores a un resultado seguro. Los errores inesperados se
 * registran con un identificador de correlación y nunca exponen detalles internos al usuario.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, code: "VALIDATION", message: "Revisa los datos del formulario.", fieldErrors: zodFieldErrors(error) };
    }
    if (isNextControlFlow(error)) throw error;
    const correlationId = crypto.randomUUID();
    console.error(`[action-error] ${correlationId}`, error);
    return {
      ok: false,
      code: "INTERNAL",
      message: `Algo salió mal. Si persiste, comparte este código con soporte: ${correlationId.slice(0, 8)}`,
    };
  }
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

// redirect() y notFound() de Next lanzan errores con `digest` que deben propagarse.
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"));
}
