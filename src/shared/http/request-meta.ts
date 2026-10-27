import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/shared/config/env";

/** Metadatos de la petición que acompañan a cada evento de auditoría. */
export type RequestMeta = { requestId?: string; ipHash?: string };

export async function currentRequestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  return {
    requestId: h.get("x-request-id") ?? crypto.randomUUID(),
    // La IP nunca se guarda en claro: solo un hash con sal secreta, útil para correlacionar abusos.
    ipHash: ip ? createHash("sha256").update(`${serverEnv().AUDIT_IP_PEPPER}:${ip}`).digest("hex").slice(0, 32) : undefined,
  };
}
