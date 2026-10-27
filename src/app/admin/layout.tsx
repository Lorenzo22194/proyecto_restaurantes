import Link from "next/link";
import { requirePlatformActor } from "@/modules/identity";
import { BrandMark } from "@/shared/ui/brand";

const links = [
  { href: "/admin/restaurantes", label: "Solicitudes" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Sin rol de plataforma la ruta responde 404. Cada página y acción vuelve a comprobarlo.
  await requirePlatformActor("/admin", ["admin", "support"]);
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-coffee">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark href="/admin" inverted />
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-coffee">Administración</span>
          </div>
          <nav aria-label="Administración" className="flex gap-4 text-sm font-semibold text-cream">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
            <Link href="/cuenta" className="underline-offset-4 hover:underline">
              Mi cuenta
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
