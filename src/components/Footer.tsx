import { business } from "@/lib/business";
import { InstagramIcon, PhoneIcon } from "./icons";

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#carta", label: "La carta" },
  { href: "#visitar", label: "Visitar" },
] as const;

export function Footer() {
  const { name, descriptor, instagram, phone, address } = business;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-brush text-3xl font-bold leading-none text-brand">
            {name}
          </p>
          <p className="mt-2 font-display text-sm uppercase tracking-[0.22em] text-cream-dim">
            {descriptor}
          </p>
          <p className="mt-4 text-sm text-cream-dim">{address.publicLabel}</p>
        </div>

        <nav aria-label="Navegación del pie">
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-cream-dim">
            Navegación
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-cream transition-colors hover:text-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-cream-dim">
            Contacto
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={phone.href}
                className="inline-flex items-center gap-2 text-cream transition-colors hover:text-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
              >
                <PhoneIcon className="h-4 w-4 text-brand-bright" />
                {phone.display}
              </a>
            </li>
            <li>
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cream transition-colors hover:text-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
              >
                <InstagramIcon className="h-4 w-4 text-brand-bright" />
                {instagram.handle}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-4 py-5 text-sm text-cream-dim sm:px-6">
          <p>
            © {year} {name} {descriptor}
          </p>
        </div>
      </div>
    </footer>
  );
}
