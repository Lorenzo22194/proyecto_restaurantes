import "server-only";
import { restaurantOutboxHandlers } from "@/modules/restaurants";
import { processOutbox } from "@/shared/outbox/outbox";

// Raíz de composición: el único lugar que conoce los manejadores de todos los módulos.
const handlers = { ...restaurantOutboxHandlers };

export function drainOutbox(limit?: number) {
  return processOutbox(handlers, limit);
}
