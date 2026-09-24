import {
  CART_STORAGE_KEY,
  parsePersistedCart,
  serializeCart,
  type CartLine,
} from "./cart-logic";

/**
 * In-memory cart store bridged to localStorage for useSyncExternalStore.
 *
 * - getServerSnapshot() is a stable empty array → SSR and first client
 *   render agree (no hydration mismatch).
 * - After mount, React re-reads getSnapshot(); the browser snapshot is
 *   cached until a mutation invalidates it.
 * - Never touches the network or Supabase.
 */

const EMPTY: CartLine[] = [];

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): CartLine[] {
  try {
    if (typeof window === "undefined") return EMPTY;
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw === null) return EMPTY;
    return parsePersistedCart(raw) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeToStorage(lines: readonly CartLine[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
  } catch {
    // Quota / private mode — keep in-memory only for this session.
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Browser snapshot (cached). */
export function getCartSnapshot(): CartLine[] {
  if (cache === null) {
    cache = readFromStorage();
  }
  return cache;
}

/** Stable identity for SSR / first paint. */
export function getCartServerSnapshot(): CartLine[] {
  return EMPTY;
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Replace lines, persist, notify subscribers. */
export function setCartLines(next: readonly CartLine[]): void {
  cache = [...next];
  writeToStorage(cache);
  emit();
}

export function resetCartCacheForTests(): void {
  cache = null;
}
