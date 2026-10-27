import { BrandMark } from "@/shared/ui/brand";
import { BottomNav, type BottomNavItem } from "@/shared/ui/bottom-nav";

// QR, actividad y la cartera con programas llegan en la Fase B; se muestran desactivados.
const navItems: BottomNavItem[] = [
  { label: "Explorar", href: "/explorar", icon: "⌕" },
  { label: "Cartera", href: "/cuenta", icon: "◈" },
  { label: "Mi QR", href: "/qr", icon: "▦", featured: true, disabled: true },
  { label: "Actividad", href: "/actividad", icon: "↺", disabled: true },
  { label: "Perfil", href: "/perfil", icon: "☺" },
];

export default function ConsumerLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-lg items-center px-4 py-3">
          <BrandMark href="/cuenta" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">{children}</main>
      <BottomNav items={navItems} />
    </div>
  );
}
