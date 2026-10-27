import type { Metadata } from "next";
import { requireOnboardedActor } from "@/modules/identity";
import { getRestaurantForMember, ROLE_LABELS } from "@/modules/restaurants";
import { orNotFound } from "@/shared/http/page-helpers";
import { ButtonLink } from "@/shared/ui/button";
import { Alert, Card, PageHeader } from "@/shared/ui/surface";
import { RestaurantStatusChip } from "../status";

export const metadata: Metadata = { title: "Restaurante" };

export default async function RestaurantPage(props: PageProps<"/panel/[restaurantId]">) {
  const { restaurantId } = await props.params;
  const actor = await requireOnboardedActor(`/panel/${restaurantId}`);
  const restaurant = await orNotFound(getRestaurantForMember(actor, restaurantId));

  return (
    <>
      <PageHeader
        title={restaurant.displayName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RestaurantStatusChip status={restaurant.status} />
            Tu rol: {ROLE_LABELS[restaurant.myRole]}
          </span>
        }
        actions={
          <ButtonLink href={`/panel/${restaurant.id}/equipo`} variant="secondary">
            Equipo
          </ButtonLink>
        }
      />

      {restaurant.status === "pending" && (
        <Alert tone="warning" title="Solicitud en revisión">
          Un administrador de la plataforma revisará tus datos. Mientras tanto puedes invitar a tu equipo; el restaurante no
          será visible para los clientes hasta que lo aprobemos.
        </Alert>
      )}
      {restaurant.status === "rejected" && (
        <Alert tone="error" title="Solicitud no aprobada">
          {restaurant.reviewNote ?? "Contacta con soporte para conocer el motivo."}
        </Alert>
      )}
      {restaurant.status === "approved" && (
        <Alert tone="success" title="Restaurante aprobado">
          Próximamente podrás configurar tu catálogo, tus campañas de fidelización y el modo caja.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Datos del negocio</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-coffee-muted">Razón social</dt>
            <dd>{restaurant.legalName}</dd>
            <dt className="text-coffee-muted">Identificador</dt>
            <dd className="font-mono">{restaurant.slug}</dd>
            <dt className="text-coffee-muted">Moneda</dt>
            <dd>{restaurant.currency}</dd>
            <dt className="text-coffee-muted">Zona horaria</dt>
            <dd>{restaurant.timezone.replace(/_/g, " ")}</dd>
          </dl>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Sedes</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {restaurant.locations.map((location) => (
              <li key={location.id} className="flex flex-col">
                <span className="font-semibold">{location.name}</span>
                <span className="text-coffee-muted">{location.address}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
