export const MEMBER_ROLES = ["owner", "manager", "cashier"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const RESTAURANT_STATUSES = ["pending", "approved", "rejected", "suspended", "closed"] as const;
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Dueño",
  manager: "Gerente",
  cashier: "Cajero",
};

export const STATUS_LABELS: Record<RestaurantStatus, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  suspended: "Suspendido",
  closed: "Cerrado",
};

/** Roles que cada rol puede invitar. El dueño fundador se crea con la solicitud de alta. */
const INVITABLE_BY: Record<MemberRole, readonly MemberRole[]> = {
  owner: ["manager", "cashier"],
  manager: ["cashier"],
  cashier: [],
};

export function canInvite(inviter: MemberRole, target: MemberRole): boolean {
  return INVITABLE_BY[inviter].includes(target);
}

export function invitableRoles(inviter: MemberRole): readonly MemberRole[] {
  return INVITABLE_BY[inviter];
}

/** Gestionar el equipo (revocar accesos) es exclusivo del dueño. */
export function canManageTeam(role: MemberRole): boolean {
  return role === "owner";
}

const TRANSITIONS: Record<RestaurantStatus, readonly RestaurantStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["suspended", "closed"],
  suspended: ["approved", "closed"],
  rejected: [],
  closed: [],
};

/** Misma tabla de transiciones que aplica el trigger restaurants_guard en la base de datos. */
export function canTransition(from: RestaurantStatus, to: RestaurantStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Convierte un nombre comercial en un identificador de URL: "Café La Ñapa" → "cafe-la-napa". */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "restaurante";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
