/**
 * Pure cart domain logic (Phase 3) — no React, no localStorage, no network.
 *
 * Line identity is structural: productId + presentation + selectedOption.
 * Never array indexes, never product display names.
 *
 * Constraints (approved brief):
 * - quantity 1–20 per line (same bound as orders.quantity in the DB).
 * - note ≤ 280 characters (same bound as order_items.note).
 * - prices are NOT modeled yet (price_cents is NULL server-side); totals
 *   render as "Total a confirmar" until the business supplies prices.
 * - Persistence payload stores only what reconstructs the user's selection.
 */

export const CART_STORAGE_KEY = "elcolorado.cart.v1";
export const CART_VERSION = 1 as const;

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 20;
export const MAX_NOTE_LENGTH = 280;

/** One cart line. presentation / selectedOption are null when unused. */
export type CartLine = {
  productId: string;
  presentation: string | null;
  selectedOption: string | null;
  note: string;
  quantity: number;
};

export type CartLineKeyInput = Pick<
  CartLine,
  "productId" | "presentation" | "selectedOption"
>;

export type AddToCartInput = {
  productId: string;
  presentation?: string | null;
  selectedOption?: string | null;
  /** Extra units to add in this action (default 1). */
  quantity?: number;
  note?: string;
};

/** Stable structural key — nullish selection parts collapse to "". */
export function lineKey(input: CartLineKeyInput): string {
  const presentation = input.presentation ?? "";
  const selectedOption = input.selectedOption ?? "";
  return [input.productId, presentation, selectedOption].join("\u0000");
}

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  const n = Math.trunc(value);
  if (n < MIN_QUANTITY) return MIN_QUANTITY;
  if (n > MAX_QUANTITY) return MAX_QUANTITY;
  return n;
}

export function clampNote(value: string): string {
  if (typeof value !== "string") return "";
  return value.length > MAX_NOTE_LENGTH
    ? value.slice(0, MAX_NOTE_LENGTH)
    : value;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Add a line, consolidating quantity when the structural key already exists.
 * Quantity is clamped to 1–20; a merge that would exceed 20 stops at 20.
 */
export function addLine(
  lines: readonly CartLine[],
  input: AddToCartInput,
): CartLine[] {
  const productId =
    typeof input.productId === "string" ? input.productId.trim() : "";
  if (productId === "") return [...lines];

  const presentation = normalizeOptionalText(input.presentation);
  const selectedOption = normalizeOptionalText(input.selectedOption);
  const note = clampNote(typeof input.note === "string" ? input.note : "");
  const delta = clampQuantity(input.quantity ?? 1);

  const key = lineKey({ productId, presentation, selectedOption });
  const existingIndex = lines.findIndex((line) => lineKey(line) === key);

  if (existingIndex === -1) {
    return [
      ...lines,
      { productId, presentation, selectedOption, note, quantity: delta },
    ];
  }

  return lines.map((line, index) => {
    if (index !== existingIndex) return line;
    return {
      ...line,
      note: note !== "" ? note : line.note,
      quantity: clampQuantity(line.quantity + delta),
    };
  });
}

export function setLineQuantity(
  lines: readonly CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line,
  );
}

export function setLineNote(
  lines: readonly CartLine[],
  key: string,
  note: string,
): CartLine[] {
  const next = clampNote(note);
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, note: next } : line,
  );
}

export function removeLine(
  lines: readonly CartLine[],
  key: string,
): CartLine[] {
  return lines.filter((line) => lineKey(line) !== key);
}

/** Sum of quantities across lines (badge count). */
export function totalItems(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.productId !== "string" || v.productId.trim() === "") return false;
  if (v.presentation !== null && typeof v.presentation !== "string") return false;
  if (v.selectedOption !== null && typeof v.selectedOption !== "string") return false;
  if (typeof v.note !== "string") return false;
  if (v.note.length > MAX_NOTE_LENGTH) return false;
  if (typeof v.quantity !== "number" || !Number.isFinite(v.quantity)) return false;
  if (!Number.isInteger(v.quantity)) return false;
  if (v.quantity < MIN_QUANTITY || v.quantity > MAX_QUANTITY) return false;

  return true;
}

function normalizeLine(raw: CartLine): CartLine {
  return {
    productId: raw.productId.trim(),
    presentation:
      typeof raw.presentation === "string" && raw.presentation.trim() !== ""
        ? raw.presentation.trim()
        : null,
    selectedOption:
      typeof raw.selectedOption === "string" && raw.selectedOption.trim() !== ""
        ? raw.selectedOption.trim()
        : null,
    note: clampNote(raw.note),
    quantity: clampQuantity(raw.quantity),
  };
}

/**
 * Tolerant reader for localStorage payloads.
 * Returns null when the value must be discarded (corrupt, wrong version,
 * wrong shape). Never throws. Invalid individual lines are dropped.
 */
export function parsePersistedCart(raw: unknown): CartLine[] | null {
  if (typeof raw !== "string" || raw === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const envelope = parsed as Record<string, unknown>;

  if (envelope.version !== CART_VERSION) return null;
  if (!Array.isArray(envelope.lines)) return null;

  const lines: CartLine[] = [];
  for (const entry of envelope.lines) {
    if (!isCartLine(entry)) continue;
    lines.push(normalizeLine(entry));
  }

  const byKey = new Map<string, CartLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const prev = byKey.get(key);
    if (prev) {
      byKey.set(key, {
        ...prev,
        note: line.note !== "" ? line.note : prev.note,
        quantity: clampQuantity(prev.quantity + line.quantity),
      });
    } else {
      byKey.set(key, line);
    }
  }

  return [...byKey.values()];
}

export function serializeCart(lines: readonly CartLine[]): string {
  const cleaned = lines.filter(isCartLine).map(normalizeLine);
  return JSON.stringify({ version: CART_VERSION, lines: cleaned });
}
