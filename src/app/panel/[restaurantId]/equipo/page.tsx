import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedActor } from "@/modules/identity";
import { canManageTeam, getRestaurantForMember, invitableRoles, listTeam, ROLE_LABELS } from "@/modules/restaurants";
import { orNotFound } from "@/shared/http/page-helpers";
import { Card, PageHeader, StatusChip } from "@/shared/ui/surface";
import { InviteForm } from "./invite-form";
import { RevokeForm } from "./revoke-form";

export const metadata: Metadata = { title: "Equipo" };

const STATUS = {
  active: { tone: "success", label: "Activo" },
  invited: { tone: "warning", label: "Invitación pendiente" },
  revoked: { tone: "neutral", label: "Revocado" },
} as const;

export default async function TeamPage(props: PageProps<"/panel/[restaurantId]/equipo">) {
  const { restaurantId } = await props.params;
  const actor = await requireOnboardedActor(`/panel/${restaurantId}/equipo`);
  const [restaurant, team] = await Promise.all([
    orNotFound(getRestaurantForMember(actor, restaurantId)),
    orNotFound(listTeam(actor, restaurantId)),
  ]);
  const roles = invitableRoles(team.myRole);
  const locationNames = new Map(restaurant.locations.map((l) => [l.id, l.name]));

  return (
    <>
      <Link href={`/panel/${restaurant.id}`} className="text-sm font-semibold text-wine underline-offset-2 hover:underline">
        ← {restaurant.displayName}
      </Link>
      <PageHeader title="Equipo" description="Quién puede operar este restaurante y con qué permisos." />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="flex flex-col gap-1 p-0">
          <h2 className="px-5 pt-5 font-display text-xl font-semibold">Miembros</h2>
          <ul className="divide-y divide-line">
            {team.members.map((member) => (
              <li key={member.id} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {member.name ?? member.email}
                      {member.isMe && <span className="font-normal text-coffee-muted"> (tú)</span>}
                    </span>
                    {member.name && <span className="text-sm break-all text-coffee-muted">{member.email}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone="brand">{ROLE_LABELS[member.role]}</StatusChip>
                    <StatusChip tone={STATUS[member.status].tone}>{STATUS[member.status].label}</StatusChip>
                  </div>
                </div>
                {member.locationIds.length > 0 && (
                  <p className="text-sm text-coffee-muted">
                    Sedes: {member.locationIds.map((id) => locationNames.get(id)).filter(Boolean).join(", ")}
                  </p>
                )}
                {canManageTeam(team.myRole) && !member.isMe && member.role !== "owner" && member.status !== "revoked" && (
                  <RevokeForm restaurantId={restaurant.id} memberId={member.id} pending={member.status === "invited"} />
                )}
              </li>
            ))}
          </ul>
        </Card>

        {roles.length > 0 ? (
          <InviteForm
            restaurantId={restaurant.id}
            roles={roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
            locations={restaurant.locations.map((l) => ({ id: l.id, name: l.name }))}
          />
        ) : (
          <Card>
            <p className="text-sm text-coffee-muted">Tu rol no permite invitar a otras personas.</p>
          </Card>
        )}
      </div>
    </>
  );
}
