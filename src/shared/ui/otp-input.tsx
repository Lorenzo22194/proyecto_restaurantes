import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * Un solo campo numérico en lugar de casillas separadas: permite pegar el código, el autocompletado
 * del sistema (`one-time-code`) y funciona bien con lectores de pantalla.
 */
export function OtpInput({ className, length = 6, ...props }: Omit<ComponentProps<"input">, "type"> & { length?: number }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`\\d{${length}}`}
      maxLength={length}
      className={cn(
        "min-h-14 w-full rounded-control border border-line bg-surface px-4 text-center font-mono text-2xl tracking-[0.5em]",
        "aria-[invalid=true]:border-error",
        className,
      )}
      {...props}
    />
  );
}
