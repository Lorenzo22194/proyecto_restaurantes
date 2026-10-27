import type { Metadata } from "next";
import { hasPlatformRole, requirePlatformActor } from "@/modules/identity";
import { listPendingApplications } from "@/modules/restaurants";
import { Card, EmptyState, PageHeader } from "@/shared/ui/surface";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Solicitudes de alta" };

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export default async function ApplicationsPage() {
  const actor = await requirePlatformActor("/admin/restaurantes", ["admin", "support"]);
  const applications = await listPendingApplications(actor);
  const canReview = hasPlatformRole(actor, "admin");

  return (
    <>
      <PageHeader title="Solicitudes de alta" description="Restaurantes que esperan revisión. Toda decisión queda auditada." />
      {applications.length === 0 ? (
        <EmptyState title="No hay solicitudes pendientes" />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {applications.map((application) => (
            <li key={application.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-xl font-semibold text-wine">{application.displayName}</h2>
                  <p className="text-sm text-coffee-muted">Recibida el {dateFormat.format(application.createdAt)}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-coffee-muted">Razón social</dt>
                  <dd>{application.legalName}</dd>
                  <dt className="text-coffee-muted">Id. fiscal</dt>
                  <dd className="font-mono">{application.taxId}</dd>
                  <dt className="text-coffee-muted">Solicitante</dt>
                  <dd className="break-all">{application.applicantEmail}</dd>
                  <dt className="text-coffee-muted">Moneda / zona</dt>
                  <dd>
                    {application.currency} · {application.timezone.replace(/_/g, " ")}
                  </dd>
                </dl>
                {canReview ? (
                  <ReviewForm restaurantId={application.id} />
                ) : (
                  <p className="text-sm text-coffee-muted">Solo un administrador puede aprobar o rechazar.</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
