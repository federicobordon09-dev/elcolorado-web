"use client";

import { useCart } from "./CartProvider";

/**
 * Floating cart summary bar at the bottom of the viewport.
 * Only visible when cart has items, is hydrated, and drawer is closed.
 * Respects safe-area-inset-bottom on mobile.
 */
export function CartBar() {
  const { itemCount, hydrated, isOpen, openCart } = useCart();

  if (!hydrated || itemCount === 0 || isOpen) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pb-4 sm:pb-4 sm:right-4 sm:left-auto sm:w-auto sm:max-w-md sm:bottom-4 sm:rounded-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0.75rem)",
      }}
      role="status"
      aria-live="polite"
      aria-label={`Carrito con ${itemCount} productos`}
    >
      <div className="mx-auto max-w-md rounded-xl border border-line/40 bg-ink-soft/95 backdrop-blur-sm shadow-2xl p-3">
        <button
          type="button"
          onClick={openCart}
          className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60"
          aria-label={`Abrir carrito, ${itemCount} productos`}
        >
          <div className="flex items-center gap-2">
            {/* Cart icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 text-brand"
            >
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V7a3 3 0 0 1 6 0v1" />
            </svg>
            <span className="font-medium text-cream">
              {itemCount === 1 ? "1 producto" : `${itemCount} productos`}
            </span>
          </div>
          <span className="flex-shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
            Ver carrito
          </span>
        </button>
      </div>
    </div>
  );
}