import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedActor } from "@/modules/identity";
import { listMyRestaurants, ROLE_LABELS } from "@/modules/restaurants";
import { ButtonLink } from "@/shared/ui/button";
import { EmptyState, PageHeader } from "@/shared/ui/surface";
import { RestaurantStatusChip } from "./status";

export const metadata: Metadata = { title: "Mis restaurantes" };

export default async function PanelHomePage() {
  const actor = await requireOnboardedActor("/panel");
  const restaurants = await listMyRestaurants(actor);

  return (
    <>
      <PageHeader
        title="Mis restaurantes"
        description="Restaurantes en los que tienes un rol activo."
        actions={<ButtonLink href="/panel/alta">Registrar restaurante</ButtonLink>}
      />
      {restaurants.length === 0 ? (
        <EmptyState title="Todavía no tienes restaurantes">
          Solicita el alta de tu restaurante o pide a su dueño que te invite con este correo.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <Link
                href={`/panel/${restaurant.id}`}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 transition-colors hover:border-wine"
              >
                <span className="font-display text-xl font-semibold text-wine">{restaurant.displayName}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-coffee-muted">
                  <RestaurantStatusChip status={restaurant.status} />
                  Tu rol: {ROLE_LABELS[restaurant.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
