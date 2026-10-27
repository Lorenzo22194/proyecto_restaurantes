import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "@/shared/errors";

/** En páginas, un recurso inexistente o ajeno se muestra como 404 de Next. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) notFound();
    throw error;
  }
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
