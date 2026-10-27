import Link from "next/link";
import { BRAND } from "@/shared/config/brand";
import { cn } from "./cn";

export function BrandMark({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-xl font-semibold", inverted ? "text-white" : "text-wine")}>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-gold text-base text-coffee">
        S
      </span>
      {BRAND.name}
    </Link>
  );
}
