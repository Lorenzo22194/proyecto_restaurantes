import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-card border border-line bg-surface p-5", className)} {...props} />;
}

type Tone = "neutral" | "success" | "warning" | "error" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-info-bg text-coffee",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-coffee",
  error: "bg-error-bg text-error",
  brand: "bg-wine-50 text-wine",
};

const toneIcons: Record<Tone, string> = { neutral: "•", success: "✓", warning: "◷", error: "✕", brand: "★" };

/** Etiqueta de estado: siempre lleva icono y texto, nunca depende solo del color. */
export function StatusChip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", toneClasses[tone])}>
      <span aria-hidden="true">{toneIcons[tone]}</span>
      {children}
    </span>
  );
}

type AlertTone = Exclude<Tone, "brand">;

export function Alert({ tone = "neutral", title, children }: { tone?: AlertTone; title?: string; children?: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-control px-4 py-3 text-sm", toneClasses[tone])}
    >
      <span aria-hidden="true" className="font-bold">
        {toneIcons[tone]}
      </span>
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={tone === "error" || tone === "success" ? "" : "text-coffee"}>{children}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-wine">{title}</h1>
        {description && <p className="max-w-prose text-coffee-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-coffee-muted">{children}</div>}
    </div>
  );
}
