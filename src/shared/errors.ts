export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "INTERNAL";

/** Error esperado del dominio. Su mensaje es seguro para mostrarlo al usuario. */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (message = "No tienes permiso para realizar esta acción.") =>
  new AppError("FORBIDDEN", message);

/** Se usa también cuando el recurso existe pero el actor no puede verlo, para no revelar su existencia. */
export const notFound = (message = "No encontramos lo que buscas.") => new AppError("NOT_FOUND", message);

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pgError = findPgError(error);
  return pgError?.code === "23505" && (!constraint || pgError.constraint === constraint);
}

export function isInsufficientPrivilege(error: unknown): boolean {
  const code = findPgError(error)?.code;
  // 42501: privilegio insuficiente o fila rechazada por RLS.
  return code === "42501";
}

type PgErrorLike = { code?: string; constraint?: string };

function findPgError(error: unknown): PgErrorLike | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "object" && current !== null && "code" in current) {
      return current as PgErrorLike;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
