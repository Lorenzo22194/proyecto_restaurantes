import { timingSafeEqual } from "node:crypto";
import { drainOutbox } from "@/composition/outbox";
import { serverEnv } from "@/shared/config/env";

/** Lo invoca el cron (Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`). */
export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !safeEqual(provided, secret)) {
    return new Response("No encontrado", { status: 404 });
  }
  const result = await drainOutbox(50);
  return Response.json(result);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
