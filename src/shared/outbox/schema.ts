import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Eventos pendientes de procesar (patrón outbox). Se insertan en la misma transacción que el cambio
 * que los origina, así que nunca se pierden aunque falle el envío posterior.
 */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    check("outbox_events_status_check", sql`${t.status} in ('pending', 'done', 'failed')`),
    index("outbox_events_pending_idx").on(t.nextAttemptAt).where(sql`${t.status} = 'pending'`),
  ],
);
