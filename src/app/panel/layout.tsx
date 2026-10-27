import Link from "next/link";
import { BrandMark } from "@/shared/ui/brand";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark href="/panel" />
            <span className="rounded-full bg-wine-50 px-2.5 py-1 text-xs font-semibold text-wine">Restaurantes</span>
          </div>
          <Link href="/cuenta" className="text-sm font-semibold text-wine underline-offset-2 hover:underline">
            Mi cuenta
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
