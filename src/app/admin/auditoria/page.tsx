import type { Metadata } from "next";
import { listRecentAuditEvents } from "@/modules/audit-security";
import { requirePlatformActor } from "@/modules/identity";
import { Card, EmptyState, PageHeader } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Auditoría" };

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "medium" });

export default async function AuditPage() {
  const actor = await requirePlatformActor("/admin/auditoria", ["admin", "support"]);
  const events = await listRecentAuditEvents(actor, 100);

  return (
    <>
      <PageHeader title="Auditoría" description="Últimos 100 eventos. El registro es de solo inserción: nadie puede editarlo ni borrarlo." />
      {events.length === 0 ? (
        <EmptyState title="Sin eventos todavía" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <caption className="sr-only">Eventos de auditoría recientes</caption>
            <thead className="border-b border-line bg-cream-50 text-coffee-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-3 font-semibold">Acción</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rol</th>
                <th scope="col" className="px-4 py-3 font-semibold">Entidad</th>
                <th scope="col" className="px-4 py-3 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{dateFormat.format(event.occurredAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{event.action}</td>
                  <td className="px-4 py-3">{event.actorRole}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {event.entityType}:{event.entityId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{event.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
