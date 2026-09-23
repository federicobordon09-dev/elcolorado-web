import { business } from "@/lib/business";
import { Reveal } from "./Reveal";
import { focusRing } from "./ui";
import { InstagramIcon, PhoneIcon, PinIcon } from "./icons";

/**
 * Visit / contact section.
 * - Location: renders only the neutral public label until the exact address
 *   is confirmed (variants stay internal in business.ts / README).
 * - Phone: call-only CTA. WhatsApp is NOT claimed until confirmed.
 */
export function Visitar() {
  const { address, phone, instagram } = business;

  return (
    <section
      id="visitar"
      aria-labelledby="visitar-title"
      className="border-t border-line bg-ink-soft"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <h2
            id="visitar-title"
            className="font-brush text-5xl font-bold leading-none text-brand-bright sm:text-6xl"
          >
            Visitanos
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {/* Location */}
            <article className="flex flex-col rounded-2xl border border-line bg-ink p-6">
              <div className="flex items-center gap-3">
                <PinIcon className="h-6 w-6 text-brand-bright" />
                <h3 className="font-display text-xl uppercase tracking-wide">
                  Ubicación
                </h3>
              </div>
              <p className="mt-4 text-lg text-cream">{address.publicLabel}</p>
            </article>

            {/* Phone */}
            <article className="flex flex-col rounded-2xl border border-line bg-ink p-6">
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-6 w-6 text-brand-bright" />
                <h3 className="font-display text-xl uppercase tracking-wide">
                  Teléfono
                </h3>
              </div>
              <p className="mt-4 font-display text-3xl tracking-wide text-cream">
                {phone.display}
              </p>
              <a
                href={phone.href}
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-bright active:translate-y-0 ${focusRing}`}
              >
                <PhoneIcon className="h-4 w-4" />
                Llamar
              </a>
            </article>

            {/* Instagram */}
            <article className="flex flex-col rounded-2xl border border-line bg-ink p-6">
              <div className="flex items-center gap-3">
                <InstagramIcon className="h-6 w-6 text-brand-bright" />
                <h3 className="font-display text-xl uppercase tracking-wide">
                  Instagram
                </h3>
              </div>
              <p className="mt-4 text-lg text-cream">{instagram.handle}</p>
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-cream/25 px-6 py-3 text-sm font-semibold text-cream transition hover:-translate-y-0.5 hover:border-brand hover:text-brand-bright active:translate-y-0 ${focusRing}`}
              >
                <InstagramIcon className="h-4 w-4" />
                Abrir Instagram
              </a>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
