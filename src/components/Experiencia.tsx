import { PizzaRoundArt } from "./icons";
import { Reveal } from "./Reveal";

/**
 * Short editorial band communicating the variety of the menu (the 8 verified
 * categories) as a staggered typographic composition — no kicker/heading/swash
 * formula, no navigation duplication, no invented claims.
 */
export function Experiencia() {
  return (
    <section
      id="experiencia"
      aria-labelledby="experiencia-title"
      className="relative overflow-hidden border-t border-line bg-ink-soft"
    >
      <h2 id="experiencia-title" className="sr-only">
        La oferta de El Colorado
      </h2>

      <Reveal className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-10">
        <div>
          <p className="font-display text-4xl uppercase leading-[1.02] tracking-wide text-cream sm:text-5xl lg:text-6xl">
            Pizzas y sándwiches
          </p>
          <p className="mt-2 ml-8 font-brush text-5xl font-bold leading-tight text-brand-bright sm:ml-16 sm:text-5xl lg:text-5xl">
            Vizcacheras y licuados
          </p>
          <p className="mt-2 ml-4 font-display text-4xl uppercase leading-[1.02] tracking-wide text-cream sm:ml-10 sm:text-5xl lg:text-6xl">
            Cafetería y bebidas
          </p>
          <p className="mt-2 ml-12 font-display text-4xl uppercase leading-[1.02] tracking-wide text-cream sm:ml-28 sm:text-5xl lg:text-6xl">
            Cervezas y tragos
          </p>
          <p className="mt-6 text-cream-dim">
            La carta de El Colorado, sección por sección.
          </p>
        </div>

        {/* Red organic shape with black line-art pizza (PDF language). */}
        <div aria-hidden="true" className="relative h-44 sm:h-56">
          <div className="absolute -right-16 top-0 h-full w-[72%] rounded-[58%_42%_60%_40%/50%_55%_45%_50%] bg-brand sm:-right-10" />
          <PizzaRoundArt className="absolute right-5 top-1/2 h-36 w-36 -translate-y-1/2 -rotate-6 text-ink sm:right-12 sm:h-44 sm:w-44" />
          <span className="absolute bottom-4 left-4 h-3 w-3 rounded-full bg-brand" />
          <span className="absolute left-10 top-6 h-2.5 w-2.5 rounded-full bg-cream/70" />
        </div>
      </Reveal>
    </section>
  );
}
