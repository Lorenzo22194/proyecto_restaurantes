// Núcleo compartido: el actor lo construye Identity, pero todos los módulos lo consumen.
export const PLATFORM_ROLES = ["admin", "support", "moderator", "finance"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Quién ejecuta una operación. Se construye en el servidor a partir de la sesión verificada. */
export type Actor = {
  userId: string;
  email: string;
  name: string;
  platformRoles: readonly PlatformRole[];
};

export function hasPlatformRole(actor: Actor, ...roles: PlatformRole[]): boolean {
  return actor.platformRoles.some((role) => roles.includes(role));
}

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}
