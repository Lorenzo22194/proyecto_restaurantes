import { afterAll, describe, expect, it } from "vitest";
import { getAuth, resolveActor } from "@/modules/identity";
import { readDevMailbox } from "@/shared/mail/mailer";
import { admin, closeTestPools, uniqueEmail } from "../support/db";

afterAll(closeTestPools);

const ORIGIN = "http://localhost:3000";

/** Llama a la API HTTP de Better Auth en proceso, igual que lo haría el navegador. */
async function post(path: string, body: unknown, ip: string) {
  return getAuth().handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

function lastOtpFor(email: string): string {
  const mail = readDevMailbox().find((m) => m.to === email);
  const otp = mail?.text.match(/\b(\d{6})\b/)?.[1];
  if (!otp) throw new Error(`No llegó código para ${email}`);
  return otp;
}

function sessionCookie(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

describe("acceso por código de un solo uso", () => {
  it("envía un código al correo, inicia sesión con él y crea la cuenta", async () => {
    const email = uniqueEmail("Nueva.Persona");
    const ip = "10.0.0.1";
    expect((await post("/email-otp/send-verification-otp", { email, type: "sign-in" }, ip)).status).toBe(200);

    const otp = lastOtpFor(email.toLowerCase());
    const signIn = await post("/sign-in/email-otp", { email, otp }, ip);
    expect(signIn.status).toBe(200);

    const actor = await resolveActor(new Headers({ cookie: sessionCookie(signIn) }));
    expect(actor).toMatchObject({ email: email.toLowerCase(), platformRoles: [] });
  });

  it("un código incorrecto no inicia sesión y el código se invalida tras los intentos permitidos", async () => {
    const email = uniqueEmail("intentos");
    const ip = "10.0.0.2";
    await post("/email-otp/send-verification-otp", { email, type: "sign-in" }, ip);
    const otp = lastOtpFor(email);
    const wrong = otp === "000000" ? "111111" : "000000";

    for (let i = 0; i < 3; i++) {
      expect((await post("/sign-in/email-otp", { email, otp: wrong }, ip)).status).not.toBe(200);
    }
    // Agotados los intentos, ni el código correcto sirve.
    expect((await post("/sign-in/email-otp", { email, otp }, ip)).status).not.toBe(200);
  });

  it("una cuenta suspendida no puede abrir sesión aunque tenga un código válido", async () => {
    const email = uniqueEmail("suspendida");
    await admin().query("insert into users (email, name, email_verified, status) values ($1, 'x', true, 'suspended')", [email]);
    const ip = "10.0.0.3";
    await post("/email-otp/send-verification-otp", { email, type: "sign-in" }, ip);
    const signIn = await post("/sign-in/email-otp", { email, otp: lastOtpFor(email) }, ip);
    expect(signIn.status).not.toBe(200);
  });

  it("limita las solicitudes de código por cliente", async () => {
    const ip = "10.0.0.4";
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await post("/email-otp/send-verification-otp", { email: uniqueEmail("rl"), type: "sign-in" }, ip)).status);
    }
    expect(statuses).toContain(429);
  });
});
