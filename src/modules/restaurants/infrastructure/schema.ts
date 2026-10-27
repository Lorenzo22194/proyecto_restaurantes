import { sql } from "drizzle-orm";
import { char, check, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
// Excepción documentada en .dependency-cruiser.cjs: los esquemas pueden importar otros esquemas
// solo para declarar claves foráneas.
import { users } from "@/modules/identity/infrastructure/schema";

export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name").notNull(),
    taxId: text("tax_id").notNull(),
    status: text("status").notNull().default("pending"),
    currency: char("currency", { length: 3 }).notNull(),
    timezone: text("timezone").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("restaurants_status_check", sql`${t.status} in ('pending', 'approved', 'rejected', 'suspended', 'closed')`),
    check("restaurants_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("restaurants_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index("restaurants_status_idx").on(t.status, t.createdAt),
    index("restaurants_created_by_idx").on(t.createdBy),
  ],
);

export const restaurantLocations = pgTable(
  "restaurant_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    name: text("name").notNull(),
    address: text("address").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("restaurant_locations_status_check", sql`${t.status} in ('active', 'inactive')`),
    index("restaurant_locations_restaurant_idx").on(t.restaurantId),
  ],
);

export const restaurantMembers = pgTable(
  "restaurant_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    // Nulo mientras la invitación está pendiente; se fija al aceptarla con el correo verificado.
    userId: uuid("user_id").references(() => users.id),
    invitedEmail: text("invited_email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    check("restaurant_members_role_check", sql`${t.role} in ('owner', 'manager', 'cashier')`),
    check("restaurant_members_status_check", sql`${t.status} in ('invited', 'active', 'revoked')`),
    check("restaurant_members_email_lowercase_check", sql`${t.invitedEmail} = lower(${t.invitedEmail})`),
    check(
      "restaurant_members_user_status_check",
      sql`(${t.status} = 'invited' and ${t.userId} is null) or (${t.status} <> 'invited' and ${t.userId} is not null)`,
    ),
    uniqueIndex("restaurant_members_restaurant_user_uq")
      .on(t.restaurantId, t.userId)
      .where(sql`${t.userId} is not null`),
    uniqueIndex("restaurant_members_pending_invite_uq")
      .on(t.restaurantId, t.invitedEmail)
      .where(sql`${t.status} = 'invited'`),
    index("restaurant_members_user_idx").on(t.userId),
    index("restaurant_members_invited_email_idx").on(t.invitedEmail),
  ],
);

export const memberLocations = pgTable(
  "member_locations",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => restaurantMembers.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => restaurantLocations.id),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.locationId] }), index("member_locations_restaurant_idx").on(t.restaurantId)],
);
