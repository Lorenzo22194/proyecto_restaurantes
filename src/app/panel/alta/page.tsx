import type { Metadata } from "next";
import { requireOnboardedActor } from "@/modules/identity";
import { PageHeader } from "@/shared/ui/surface";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "Registrar restaurante" };

export default async function ApplicationPage() {
  await requireOnboardedActor("/panel/alta");
  // El país de lanzamiento sigue pendiente (D1): se ofrecen todas las zonas horarias.
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <>
      <PageHeader
        title="Registrar restaurante"
        description="Revisamos cada solicitud antes de publicarla. Mientras tanto podrás preparar tu equipo."
      />
      <ApplicationForm timezones={timezones} />
    </>
  );
}
