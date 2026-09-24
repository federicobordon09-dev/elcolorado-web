"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartButton } from "./cart/CartButton";
import { CloseIcon, MenuIcon } from "./icons";
import { focusRing } from "./ui";

const navLinks = [
  { href: "#carta", label: "La carta" },
  { href: "#visitar", label: "Visitar" },
] as const;

/**
 * Static header (not sticky): on a one-page landing the menu chip bar is
 * the only sticky element — two stacked sticky bars would eat mobile
 * viewport without improving navigation.
 */
export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="#inicio"
          className="group flex items-center"
          aria-label="El Colorado Resto Bar — inicio"
        >
          <Image
            src="/elcolorado_logo.jpg"
            alt=""
            width={150}
            height={150}
            priority
            className="h-11 w-11 rounded-sm transition-opacity group-hover:opacity-90"
          />
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`rounded-sm text-sm text-cream-dim transition-colors hover:text-cream ${focusRing}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="#carta"
                className={`rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-bright ${focusRing}`}
              >
                Ver la carta
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <CartButton />
          <button
            type="button"
            className={`rounded-md p-2 text-cream transition-colors hover:text-brand-bright md:hidden ${focusRing}`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Navegación móvil"
          className="border-t border-line px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-base text-cream transition-colors hover:bg-ink-soft hover:text-brand-bright ${focusRing}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="#carta"
                onClick={() => setOpen(false)}
                className={`block rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-bright ${focusRing}`}
              >
                Ver la carta
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
