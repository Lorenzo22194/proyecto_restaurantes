import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { eq } from "drizzle-orm";
import { BRAND } from "@/shared/config/brand";
import { serverEnv } from "@/shared/config/env";
import { getDb } from "@/shared/db/client";
import { sendMail } from "@/shared/mail/mailer";
import { accounts, rateLimits, sessions, users, verifications } from "./schema";

const OTP_TTL_SECONDS = 300;

function createAuth() {
  const env = serverEnv();
  return betterAuth({
    appName: BRAND.name,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      usePlural: true,
      schema: { users, sessions, accounts, verifications, rateLimits },
    }),
    advanced: {
      database: { generateId: "uuid" },
      cookiePrefix: "sobremesa",
    },
    // Solo acceso por código de un solo uso enviado al correo (sin contraseñas).
    emailAndPassword: { enabled: false },
    user: {
      additionalFields: {
        status: { type: "string", required: false, defaultValue: "active", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
    },
    databaseHooks: {
      session: {
        create: {
          // Un usuario suspendido o eliminado no puede abrir sesión aunque tenga un código válido.
          before: async (session) => {
            const [user] = await getDb()
              .select({ status: users.status })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (user?.status !== "active") return false;
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: OTP_TTL_SECONDS,
        allowedAttempts: 3,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 3 },
        async sendVerificationOTP({ email, otp }) {
          await sendMail({
            to: email,
            subject: `Tu código de acceso a ${BRAND.name}: ${otp}`,
            text: `Tu código es ${otp}. Vence en ${OTP_TTL_SECONDS / 60} minutos. Si no lo pediste, ignora este correo.`,
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __auth?: Auth };

export function getAuth(): Auth {
  globalForAuth.__auth ??= createAuth();
  return globalForAuth.__auth;
}
