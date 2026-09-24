import { ArrowRightIcon, PizzaSliceArt } from "./icons";
import { GhostLink, PrimaryLink } from "./ui";

/**
 * Hero: the brand lockup as protagonist over a big gastronomic illustration —
 * black line-art pizza on an energetic red organic shape, straight from the
 * menu PDF's visual language. No stats, no counters, no meta copy.
 * No photographs are used: the project has no real photos of the restaurant.
 */
export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* Decorative layers */}
      <div
        aria-hidden="true"
        className="pattern-dots pointer-events-none absolute inset-0 opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-44 h-[28rem] w-[28rem] rounded-full border border-brand/30"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-8 lg:py-20">
          <div className="max-w-xl">
            <h1>
              <span className="hero-in brush-stroke block font-brush font-bold leading-[0.9] text-brand [font-size:clamp(3.25rem,14vw,7rem)]">
                El Colorado
              </span>
              <span className="hero-in hero-in-delay-1 mt-3 block font-display uppercase leading-none tracking-[0.24em] text-cream [font-size:clamp(1.25rem,4vw,2.5rem)]">
                Resto Bar
              </span>
            </h1>

            <p className="hero-in hero-in-delay-2 mt-6 max-w-md text-lg leading-relaxed text-cream-dim">
              La carta completa de El Colorado, para ver desde el celular.
            </p>

            <div className="hero-in hero-in-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <PrimaryLink href="#carta">
                Ver la carta
                <ArrowRightIcon className="h-4 w-4" />
              </PrimaryLink>
              <GhostLink href="#visitar">Contacto</GhostLink>
            </div>
          </div>

          {/* Big line-art pizza on an energetic red organic shape (PDF language). */}
          <div
            aria-hidden="true"
            className="hero-in hero-in-delay-2 relative mx-auto aspect-square w-full max-w-[19rem] sm:max-w-[24rem] lg:max-w-[30rem]"
          >
            <div className="absolute inset-1 rounded-full border border-cream/20" />
            <div className="absolute inset-5 rotate-6 rounded-[64%_36%_48%_52%/40%_62%_38%_60%] bg-brand" />
            <PizzaSliceArt className="absolute inset-0 m-auto h-[56%] w-[56%] -rotate-6 text-ink" />
            {/* Decorative dots: each sits near the edge of a full-size invisible
                orbit container; only the container rotates (transform-only), so
                the dot travels a circular path around the illustration center.
                The pizza slice and red blob above stay static. */}
            <div className="orbit orbit-a pointer-events-none absolute inset-0">
              <span className="absolute left-0 top-12 h-3.5 w-3.5 rounded-full bg-brand" />
            </div>
            <div className="orbit orbit-b pointer-events-none absolute inset-0">
              <span className="absolute right-8 top-5 h-3 w-3 rounded-full bg-cream" />
            </div>
            <div className="orbit orbit-c pointer-events-none absolute inset-0">
              <span className="absolute bottom-6 left-12 h-2.5 w-2.5 rounded-full bg-cream/70" />
            </div>
            <div className="orbit orbit-d pointer-events-none absolute inset-0">
              <span className="absolute bottom-10 right-4 h-5 w-5 rounded-full bg-brand-bright" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
