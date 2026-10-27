import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedActor } from "@/modules/identity";
import { Card } from "@/shared/ui/surface";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const actor = await requireOnboardedActor("/perfil");
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-wine">Perfil</h1>
      <Card className="flex flex-col gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-coffee-muted">Nombre</dt>
          <dd className="font-medium">{actor.name}</dd>
          <dt className="text-coffee-muted">Correo</dt>
          <dd className="font-medium break-all">{actor.email}</dd>
        </dl>
      </Card>
      <Link href="/condiciones" className="font-semibold text-wine underline underline-offset-2">
        Condiciones y aviso de privacidad
      </Link>
      <SignOutButton />
    </>
  );
}
