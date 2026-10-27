import type { Metadata } from "next";
import { BRAND, TERMS_VERSION } from "@/shared/config/brand";
import { BrandMark } from "@/shared/ui/brand";
import { Alert } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Condiciones y privacidad" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <BrandMark />
      <h1 className="font-display text-3xl font-semibold text-wine">Condiciones y aviso de privacidad</h1>
      <Alert tone="warning" title="Borrador pendiente de revisión legal">
        Este texto resume los principios del servicio. La versión definitiva depende de la jurisdicción que se elija y la
        revisará un profesional antes del lanzamiento. Versión: {TERMS_VERSION}.
      </Alert>
      <section className="flex flex-col gap-3 leading-relaxed">
        <h2 className="font-display text-xl font-semibold">Qué datos tratamos</h2>
        <p>
          Tu correo y el nombre que elijas, las compras que el personal de cada restaurante verifica, tus puntos y premios, y los
          comentarios privados que decidas escribir. No guardamos tu dirección IP en claro: solo un identificador cifrado para
          prevenir abusos.
        </p>
        <h2 className="font-display text-xl font-semibold">Puntos por restaurante</h2>
        <p>
          Una misma cuenta sirve en todos los restaurantes de {BRAND.name}, pero los puntos de cada programa son independientes y
          nunca se transfieren entre restaurantes.
        </p>
        <h2 className="font-display text-xl font-semibold">Comentarios privados e inteligencia artificial</h2>
        <p>
          Tus comentarios son privados: los ve el restaurante, sin tu identidad por defecto, y el equipo de la plataforma para
          moderación. No se publican ni se usan como testimonio. Un sistema de IA los analiza para resumir temas y decidir si
          suman puntos por su utilidad informativa, nunca por si la opinión es positiva o negativa. Puedes pedir revisión humana.
        </p>
        <h2 className="font-display text-xl font-semibold">Reseñas públicas</h2>
        <p>No ofrecemos puntos ni premios a cambio de publicar reseñas en Google u otras plataformas.</p>
        <h2 className="font-display text-xl font-semibold">Tus derechos</h2>
        <p>Puedes consultar, exportar o eliminar tus datos. El historial contable de puntos se conserva anonimizado.</p>
      </section>
    </main>
  );
}
