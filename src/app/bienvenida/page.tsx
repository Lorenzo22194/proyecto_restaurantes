import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAcceptedCurrentTerms, requireActor } from "@/modules/identity";
import { safeNextPath } from "@/shared/http/safe-redirect";
import { BrandMark } from "@/shared/ui/brand";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage(props: PageProps<"/bienvenida">) {
  const { next } = await props.searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  const actor = await requireActor(`/bienvenida?next=${encodeURIComponent(nextPath)}`);
  if (await hasAcceptedCurrentTerms(actor)) redirect(nextPath);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <BrandMark />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-semibold text-wine">Te damos la bienvenida</h1>
          <p className="text-coffee-muted">Antes de empezar, dinos cómo llamarte y revisa cómo usamos tus datos.</p>
        </div>
        <WelcomeForm nextPath={nextPath} defaultName={actor.name} />
      </div>
    </main>
  );
}
