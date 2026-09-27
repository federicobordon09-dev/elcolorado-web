"use client";

import { useCart } from "./CartProvider";

/**
 * Invisible spacer matching CartBar height to prevent content overlap.
 * Only renders when CartBar would be visible (hydrated, items exist, drawer closed).
 */
export function CartBarSpacer() {
  const { itemCount, hydrated, isOpen } = useCart();

  if (!hydrated || itemCount === 0 || isOpen) return null;

  // Match CartBar height: mobile ~80px, desktop ~70px. Use 100px (25 units) for safety.
  return (
    <div
      aria-hidden="true"
      className="h-20 sm:h-24"
      style={{ minHeight: "80px" }}
    />
  );
}