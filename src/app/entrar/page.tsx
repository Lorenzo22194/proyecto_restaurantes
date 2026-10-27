import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/identity";
import { isDevMailboxEnabled } from "@/shared/config/env";
import { safeNextPath } from "@/shared/http/safe-redirect";
import { BrandMark } from "@/shared/ui/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage(props: PageProps<"/entrar">) {
  const { next } = await props.searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getCurrentActor()) redirect(nextPath);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <BrandMark />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold text-wine">Entra con tu correo</h1>
          <p className="text-coffee-muted">Te enviamos un código de 6 dígitos. Sin contraseñas que recordar.</p>
        </div>
        <LoginForm nextPath={nextPath} devMailbox={isDevMailboxEnabled()} />
      </div>
    </main>
  );
}
