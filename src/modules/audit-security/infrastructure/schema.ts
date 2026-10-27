import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/identity/infrastructure/schema";
import { restaurants } from "@/modules/restaurants/infrastructure/schema";

/** Registro de auditoría de solo inserción: un trigger rechaza UPDATE, DELETE y TRUNCATE. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    // Nulo solo para eventos del sistema (scripts de arranque, procesos internos).
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: text("actor_role").notNull(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
  },
  (t) => [
    index("audit_events_restaurant_idx").on(t.restaurantId, t.occurredAt),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_occurred_idx").on(t.occurredAt),
  ],
);
