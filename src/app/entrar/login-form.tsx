"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/modules/identity/client";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/field";
import { OtpInput } from "@/shared/ui/otp-input";
import { Alert } from "@/shared/ui/surface";

function errorMessage(status: number | undefined, fallback: string) {
  return status === 429 ? "Demasiados intentos. Espera un minuto y vuelve a probar." : fallback;
}

// Campos no controlados leídos con FormData: lo que se escriba antes de que React hidrate la página
// (conexiones lentas) no se pierde.
export function LoginForm({ nextPath, devMailbox }: { nextPath: string; devMailbox: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(address: string) {
    setPending(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" });
    setPending(false);
    if (error) return setError(errorMessage(error.status, "No pudimos enviar el código. Revisa el correo e inténtalo de nuevo."));
    setEmail(address);
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!address.includes("@")) return setError("Escribe un correo válido.");
    await sendCode(address);
  }

  async function onCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;
    const otp = String(new FormData(event.currentTarget).get("otp") ?? "").replace(/\D/g, "");
    if (otp.length !== 6) return setError("El código tiene 6 dígitos.");
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    if (error) {
      setPending(false);
      return setError(errorMessage(error.status, "El código es incorrecto o ya venció. Pide uno nuevo si lo necesitas."));
    }
    router.replace(nextPath);
    router.refresh();
  }

  if (!email) {
    return (
      <form onSubmit={onEmailSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Correo electrónico">
          {(control) => <Input {...control} type="email" name="email" autoComplete="email" required placeholder="tu@correo.com" />}
        </Field>
        {error && <Alert tone="error" title={error} />}
        <Button type="submit" size="lg" fullWidth disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Enviarme un código"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onCodeSubmit} className="flex flex-col gap-4">
      <p className="text-sm">
        Enviamos un código a <strong>{email}</strong>. Vence en 5 minutos.
      </p>
      {devMailbox && (
        <Alert tone="warning" title="Modo desarrollo">
          No se envían correos reales.{" "}
          <a href="/dev/correo" target="_blank" className="font-semibold underline underline-offset-2">
            Ver el código en el buzón de desarrollo
          </a>
          .
        </Alert>
      )}
      <Field label="Código de 6 dígitos">{(control) => <OtpInput {...control} name="otp" required autoFocus />}</Field>
      {error && <Alert tone="error" title={error} />}
      <Button type="submit" size="lg" fullWidth disabled={pending} aria-busy={pending}>
        {pending ? "Comprobando…" : "Entrar"}
      </Button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="font-semibold text-wine underline underline-offset-2"
          onClick={() => {
            setEmail(null);
            setError(null);
          }}
        >
          Cambiar correo
        </button>
        <button type="button" className="font-semibold text-wine underline underline-offset-2" disabled={pending} onClick={() => sendCode(email)}>
          Reenviar código
        </button>
      </div>
    </form>
  );
}
