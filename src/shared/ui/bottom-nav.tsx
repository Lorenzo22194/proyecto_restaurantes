"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";

export type BottomNavItem = {
  label: string;
  href: string;
  icon: string;
  /** Aún no disponible: se muestra pero no navega. */
  disabled?: boolean;
  featured?: boolean;
};

/** Navegación inferior del portal del consumidor (mobile-first, objetivos táctiles ≥ 44 px). */
export function BottomNav({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = !item.disabled && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "grid place-items-center text-lg",
                  item.featured && "size-11 -translate-y-3 rounded-full text-white shadow-md",
                  item.featured && (item.disabled ? "bg-coffee-muted/50 shadow-none" : "bg-wine"),
                )}
              >
                {item.icon}
              </span>
              <span className={cn(item.featured && "-mt-2")}>{item.label}</span>
            </>
          );
          const base = "flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium";
          return (
            <li key={item.label} className="flex">
              {item.disabled ? (
                <span aria-disabled="true" title="Próximamente" className={cn(base, "text-coffee-muted/60")}>
                  {content}
                  <span className="sr-only">(próximamente)</span>
                </span>
              ) : (
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(base, active ? "text-wine" : "text-coffee-muted")}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
