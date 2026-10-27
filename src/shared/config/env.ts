import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  AUDIT_IP_PEPPER: z.string().min(16),
  CRON_SECRET: z.string().min(24).optional(),
  DEV_MAILBOX: z.enum(["0", "1"]).default("0"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Lee y valida el entorno la primera vez que se usa, para no romper el build por variables ausentes. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Variables de entorno inválidas o ausentes: ${fields}`);
    }
    if (parsed.data.NODE_ENV === "production" && parsed.data.DEV_MAILBOX === "1") {
      throw new Error("DEV_MAILBOX no puede activarse en producción");
    }
    cached = parsed.data;
  }
  return cached;
}

export function isDevMailboxEnabled(): boolean {
  return serverEnv().DEV_MAILBOX === "1";
}
