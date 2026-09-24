"use client";

import { useCart } from "./CartProvider";
import { focusRing } from "../ui";

/**
 * Header cart trigger with a live item-count badge.
 * Safe for hydration: badge appears only after `hydrated` is true, so the
 * SSR markup never disagrees with the first client render.
 */
export function CartButton() {
  const { itemCount, hydrated, toggleCart, isOpen } = useCart();

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-expanded={isOpen}
      aria-controls="cart-drawer"
      aria-label={
        hydrated && itemCount > 0
          ? `Abrir carrito, ${itemCount} productos`
          : "Abrir carrito"
      }
      className={`relative rounded-full border border-line p-2 text-cream transition-colors hover:border-brand hover:text-brand-bright ${focusRing}`}
    >
      {/* Simple bag glyph — decorative; button carries the accessible name. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
      {hydrated && itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 font-display text-[11px] leading-none text-white"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
