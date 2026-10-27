"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-wine text-white hover:bg-wine-hover",
  secondary: "border border-wine bg-surface text-wine hover:bg-wine-50",
  ghost: "text-wine hover:bg-wine-50",
  // Dorado siempre con texto café: el contraste es 7.7:1.
  accent: "bg-gold text-coffee hover:brightness-95",
  danger: "border border-error bg-surface text-error hover:bg-error-bg",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", fullWidth = false) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; fullWidth?: boolean };

export function Button({ variant, size, fullWidth, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses(variant, size, fullWidth), className)} {...props} />;
}

/** Botón de envío que se desactiva y anuncia el progreso mientras el formulario se procesa. */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? "Procesando…") : children}
    </Button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; fullWidth?: boolean };

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses(variant, size, fullWidth), className)} {...props} />;
}
