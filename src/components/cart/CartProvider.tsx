"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addLine,
  removeLine,
  setLineNote,
  setLineQuantity,
  totalItems,
  type AddToCartInput,
  type CartLine,
} from "@/lib/cart-logic";
import {
  getCartServerSnapshot,
  getCartSnapshot,
  setCartLines,
  subscribeCart,
} from "@/lib/cart-store";

type CartContextValue = {
  lines: readonly CartLine[];
  /** True once the browser snapshot has been observed after mount. */
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  itemCount: number;
  add: (input: AddToCartInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateNote: (key: string, note: string) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Cart state + drawer visibility.
 *
 * Hydration: lines come from useSyncExternalStore with a stable empty
 * server snapshot — SSR markup matches the first client render; React
 * applies the browser snapshot after hydration without a mismatch warning.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Flip hydrated on first browser snapshot observation (macro-task free).
  // useSyncExternalStore already ran getCartSnapshot during hydration;
  // this flag only gates badge/drawer UI that must not appear on the server.
  if (!hydrated && typeof window !== "undefined") {
    // Render-phase state update (React docs: adjust state when a condition
    // changes before commit) — safe and avoids setState-in-effect lint.
    setHydrated(true);
  }

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  const add = useCallback((input: AddToCartInput) => {
    setCartLines(addLine(getCartSnapshot(), input));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setCartLines(setLineQuantity(getCartSnapshot(), key, quantity));
  }, []);

  const updateNote = useCallback((key: string, note: string) => {
    setCartLines(setLineNote(getCartSnapshot(), key, note));
  }, []);

  const remove = useCallback((key: string) => {
    setCartLines(removeLine(getCartSnapshot(), key));
  }, []);

  const clear = useCallback(() => {
    setCartLines([]);
  }, []);

  const itemCount = useMemo(() => totalItems(lines), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      hydrated,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      itemCount,
      add,
      updateQuantity,
      updateNote,
      remove,
      clear,
    }),
    [
      lines,
      hydrated,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      itemCount,
      add,
      updateQuantity,
      updateNote,
      remove,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return ctx;
}
