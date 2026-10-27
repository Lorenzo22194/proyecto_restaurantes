import { BRAND } from "@/shared/config/brand";
import Link from "next/link";
import { BrandMark } from "@/shared/ui/brand";
import { ButtonLink } from "@/shared/ui/button";

const pillars = [
  {
    title: "Una sola cuenta, muchos restaurantes",
    text: "Tus puntos se guardan por separado en cada restaurante y siempre ves cuánto te falta para tu premio.",
  },
  {
    title: "Compras verificadas en caja",
    text: "Cada compra la confirma el personal del restaurante con un código temporal. Sin trucos ni saldos inventados.",
  },
  {
    title: "Tu opinión, privada y útil",
    text: "Lo que cuentas llega solo al restaurante. Sumas por aportar detalles concretos, sean buenos o malos.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-wine">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <BrandMark inverted />
          <ButtonLink href="/entrar" variant="accent">
            Entrar
          </ButtonLink>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-10 pb-16 sm:pt-16 sm:pb-24">
          <p className="text-sm font-semibold tracking-wide text-gold uppercase">Fidelización para restaurantes independientes</p>
          <h1 className="max-w-2xl font-display text-4xl leading-tight font-semibold text-white sm:text-5xl">
            Vuelve a tus lugares favoritos y gana premios en cada visita.
          </h1>
          <p className="max-w-xl text-lg text-cream">{BRAND.tagline}.</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/entrar" variant="accent" size="lg">
              Crear mi cuenta
            </ButtonLink>
            <ButtonLink href="/entrar?next=/panel/alta" size="lg" className="border border-cream/60 bg-transparent text-white hover:bg-wine-hover">
              Registrar mi restaurante
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
        {pillars.map((pillar) => (
          <section key={pillar.title} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-gold" />
            <h2 className="font-display text-xl font-semibold text-wine">{pillar.title}</h2>
            <p className="text-coffee-muted">{pillar.text}</p>
          </section>
        ))}
      </main>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6 text-sm text-coffee-muted">
          <span>
            © {BRAND.name} · versión preliminar
          </span>
          <Link href="/condiciones" className="underline underline-offset-2">
            Condiciones y privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}
