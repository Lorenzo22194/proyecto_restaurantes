import "server-only";
import { sql } from "drizzle-orm";
import { withSystem, type Tx } from "@/shared/db/client";
import { outboxEvents } from "./schema";

export type OutboxHandler = (payload: unknown) => Promise<void>;
export type OutboxHandlers = Record<string, OutboxHandler>;

const MAX_ATTEMPTS = 5;
// Espera antes de cada reintento: 1 min, 5 min, 30 min, 2 h.
const BACKOFF_SECONDS = [60, 300, 1800, 7200];

/** Encola un evento dentro de la transacción del cambio que lo origina. */
export async function enqueue(tx: Tx, eventType: string, payload: Record<string, unknown>): Promise<void> {
  await tx.insert(outboxEvents).values({ eventType, payload });
}

/**
 * Procesa eventos pendientes, cada uno en su propia transacción con `FOR UPDATE SKIP LOCKED`, de
 * modo que varios procesos pueden trabajar en paralelo sin tomar el mismo evento. La entrega es
 * "al menos una vez": los manejadores deben tolerar repeticiones.
 */
export async function processOutbox(handlers: OutboxHandlers, limit = 20): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (let i = 0; i < limit; i++) {
    const outcome = await withSystem(async (tx) => {
      const result = await tx.execute<{ id: number; event_type: string; payload: unknown; attempts: number }>(sql`
        select id, event_type, payload, attempts from ${outboxEvents}
        where status = 'pending' and next_attempt_at <= now()
        order by id
        limit 1
        for update skip locked
      `);
      const event = result.rows[0];
      if (!event) return "empty" as const;

      const handler = handlers[event.event_type];
      try {
        if (!handler) throw new Error(`Sin manejador para ${event.event_type}`);
        await handler(event.payload);
        await tx.execute(sql`update ${outboxEvents} set status = 'done', processed_at = now() where id = ${event.id}`);
        return "done" as const;
      } catch (error) {
        const attempts = event.attempts + 1;
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
        const exhausted = attempts >= MAX_ATTEMPTS;
        const delay = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];
        await tx.execute(sql`
          update ${outboxEvents}
          set attempts = ${attempts},
              last_error = ${message},
              status = ${exhausted ? "failed" : "pending"},
              next_attempt_at = now() + make_interval(secs => ${delay})
          where id = ${event.id}
        `);
        return "failed" as const;
      }
    });
    if (outcome === "empty") break;
    if (outcome === "done") done++;
    else failed++;
  }
  return { done, failed };
}
