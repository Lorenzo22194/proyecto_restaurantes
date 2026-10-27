import type { Metadata } from "next";
import Link from "next/link";
import { hasPlatformRole, requireOnboardedActor } from "@/modules/identity";
import { listMyInvitations, listMyRestaurants, ROLE_LABELS } from "@/modules/restaurants";
import { ButtonLink } from "@/shared/ui/button";
import { Card, EmptyState } from "@/shared/ui/surface";
import { AcceptInvitationButton } from "./accept-invitation";

export const metadata: Metadata = { title: "Mi cartera" };

export default async function AccountPage() {
  const actor = await requireOnboardedActor("/cuenta");
  const [invitations, restaurants] = await Promise.all([listMyInvitations(actor), listMyRestaurants(actor)]);
  const isPlatformStaff = hasPlatformRole(actor, "admin", "support");

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-coffee-muted">Hola, {actor.name || "de nuevo"}</p>
        <h1 className="font-display text-3xl font-semibold text-wine">Mi cartera</h1>
      </div>

      {invitations.length > 0 && (
        <section aria-labelledby="invitaciones" className="flex flex-col gap-3">
          <h2 id="invitaciones" className="font-display text-xl font-semibold">
            Invitaciones pendientes
          </h2>
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="flex flex-col gap-3">
              <p>
                <strong>{invitation.restaurantName}</strong> te invitó a su equipo como {ROLE_LABELS[invitation.role].toLowerCase()}.
              </p>
              <AcceptInvitationButton memberId={invitation.id} />
            </Card>
          ))}
        </section>
      )}

      <EmptyState title="Aún no participas en ningún programa">
        Muy pronto podrás unirte a los programas de tus restaurantes favoritos y ver aquí tu progreso hacia cada premio.
      </EmptyState>

      {(restaurants.length > 0 || isPlatformStaff) && (
        <section aria-labelledby="accesos" className="flex flex-col gap-3">
          <h2 id="accesos" className="font-display text-xl font-semibold">
            Accesos de trabajo
          </h2>
          {restaurants.length > 0 && (
            <ButtonLink href="/panel" variant="secondary" fullWidth>
              Panel de restaurante ({restaurants.length})
            </ButtonLink>
          )}
          {isPlatformStaff && (
            <ButtonLink href="/admin" variant="secondary" fullWidth>
              Administración de la plataforma
            </ButtonLink>
          )}
        </section>
      )}

      <p className="text-center text-sm text-coffee-muted">
        ¿Tienes un restaurante?{" "}
        <Link href="/panel/alta" className="font-semibold text-wine underline underline-offset-2">
          Solicita el alta
        </Link>
      </p>
    </>
  );
}
