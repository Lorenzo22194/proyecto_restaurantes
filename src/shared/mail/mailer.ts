import "server-only";
import { isDevMailboxEnabled } from "@/shared/config/env";

export type OutgoingMail = { to: string; subject: string; text: string };
export type StoredMail = OutgoingMail & { id: string; sentAt: string };

const MAX_STORED = 50;
const globalForMail = globalThis as unknown as { __devMailbox?: StoredMail[] };

/**
 * Puerto de envío de correo. El proveedor transaccional real está pendiente (decisión D8); mientras
 * tanto solo existe el buzón de desarrollo, que guarda los mensajes en memoria y los muestra en
 * /dev/correo. Fuera de desarrollo falla de forma explícita en lugar de perder correos en silencio.
 */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (!isDevMailboxEnabled()) {
    throw new Error("No hay proveedor de correo configurado (decisión D8 pendiente)");
  }
  const stored: StoredMail = { ...mail, id: crypto.randomUUID(), sentAt: new Date().toISOString() };
  const box = (globalForMail.__devMailbox ??= []);
  box.unshift(stored);
  box.length = Math.min(box.length, MAX_STORED);
  console.info(`[dev-mailbox] Para: ${mail.to} | ${mail.subject}\n${mail.text}`);
}

export function readDevMailbox(): StoredMail[] {
  if (!isDevMailboxEnabled()) return [];
  return [...(globalForMail.__devMailbox ?? [])];
}
