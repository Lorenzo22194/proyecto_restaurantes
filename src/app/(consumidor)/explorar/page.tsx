import type { Metadata } from "next";
import { EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Explorar" };

// Exploración pública por ciudad y zona: Fase B. No se muestran restaurantes de ejemplo.
export default function ExplorePage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-wine">Explorar</h1>
      <EmptyState title="Muy pronto">
        Aquí podrás descubrir restaurantes de tu zona y sus programas de fidelización, sin necesidad de crear una cuenta.
      </EmptyState>
    </>
  );
}
