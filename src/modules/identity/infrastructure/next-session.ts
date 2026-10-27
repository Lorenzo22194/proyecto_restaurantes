import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { hasPlatformRole, type Actor, type PlatformRole } from "@/shared/kernel/actor";
import { resolveActor } from "../application/actor";
import { hasAcceptedCurrentTerms } from "../application/consents";

/** Actor de la petición actual, resuelto una sola vez por render. */
export const getCurrentActor = cache(async (): Promise<Actor | null> => resolveActor(await headers()));

function loginUrl(nextPath: string) {
  return `/entrar?next=${encodeURIComponent(nextPath)}`;
}

export async function requireActor(nextPath: string): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect(loginUrl(nextPath));
  return actor;
}

/** Exige sesión y la aceptación de los términos vigentes. */
export async function requireOnboardedActor(nextPath: string): Promise<Actor> {
  const actor = await requireActor(nextPath);
  if (!(await hasAcceptedCurrentTerms(actor))) redirect(`/bienvenida?next=${encodeURIComponent(nextPath)}`);
  return actor;
}

/** Para el panel de administración: sin el rol, la ruta responde 404 y no revela que existe. */
export async function requirePlatformActor(nextPath: string, roles: PlatformRole[]): Promise<Actor> {
  const actor = await requireOnboardedActor(nextPath);
  if (!hasPlatformRole(actor, ...roles)) notFound();
  return actor;
}
