import type { MenuOption } from "@/lib/catalog";
import {
  CheckoutErrorCode,
  CheckoutValidationError,
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
} from "./checkout-schema.ts";

// Note length constant (kept for internal validation consistency; checkout schema no longer accepts note from client)
const MAX_NOTE_LENGTH = 280;

export type CatalogProductMeta = {
  id: string;
  name: string;
  presentations: readonly string[];
  optionGroups: readonly MenuOption[];
};

export type CatalogIndexCore = ReadonlyMap<string, CatalogProductMeta>;

export type ServerLineInput = {
  productId: string;
  presentation: string | null | undefined;
  selectedOption: string | null | undefined;
  note: string;
  quantity: number;
};

export type ConsolidatedLine = {
  productId: string;
  presentation: string | null;
  selectedOption: string | null;
  note: string;
  quantity: number;
};

export type ValidatedLine = ConsolidatedLine & {
  productNameSnapshot: string;
  unitPriceCents: number | null;
};

export type ValidationContext = {
  catalog: CatalogIndexCore;
  /** categories.options map by categoryId if needed later; MVP: not required */
};

function normalizeNullable(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function lineKeyCore(p: string, pr: string | null, o: string | null): string {
  return [p, pr ?? "", o ?? ""].join("\u0000");
}

function clampQuantityInt(n: number): number {
  if (!Number.isFinite(n)) throw new CheckoutValidationError(CheckoutErrorCode.QUANTITY_INVALID, "quantity invalid");
  const v = Math.trunc(n);
  if (v < MIN_LINE_QUANTITY || v > MAX_LINE_QUANTITY)
    throw new CheckoutValidationError(CheckoutErrorCode.QUANTITY_INVALID, "quantity out of range");
  return v;
}

function sanitizeNote(s: string): string {
  if (s.length > MAX_NOTE_LENGTH)
    throw new CheckoutValidationError(CheckoutErrorCode.NOTE_TOO_LONG, "note too long");
  return s;
}

export function consolidateLines(lines: readonly ServerLineInput[]): ConsolidatedLine[] {
  const map = new Map<string, ConsolidatedLine>();
  for (const raw of lines) {
    const pid = raw.productId.trim();
    const pr = normalizeNullable(raw.presentation);
    const op = normalizeNullable(raw.selectedOption);
    const q = clampQuantityInt(raw.quantity);
    const nt = sanitizeNote(raw.note ?? "");
    const key = lineKeyCore(pid, pr, op);
    const existing = map.get(key);
    if (existing) {
      const nq = existing.quantity + q;
      if (nq > MAX_LINE_QUANTITY)
        throw new CheckoutValidationError(
          CheckoutErrorCode.DUPLICATE_LINES_MERGE_FAILED,
          "duplicate merge exceeds max quantity",
        );
      map.set(key, {
        productId: pid,
        presentation: pr,
        selectedOption: op,
        note: nt !== "" ? nt : existing.note,
        quantity: nq,
      });
    } else {
      map.set(key, {
        productId: pid,
        presentation: pr,
        selectedOption: op,
        note: nt,
        quantity: q,
      });
    }
  }
  return [...map.values()];
}

/** Validate consolidated lines against live catalog (no prices involved). */
export function validateAgainstCatalog(
  consolidated: readonly ConsolidatedLine[],
  ctx: ValidationContext,
): ValidatedLine[] {
  const out: ValidatedLine[] = [];
  for (const l of consolidated) {
    const meta = ctx.catalog.get(l.productId);
    if (!meta) {
      throw new CheckoutValidationError(
        CheckoutErrorCode.PRODUCT_NOT_FOUND,
        `product not found: ${l.productId}`,
      );
    }

    // presentation
    if (l.presentation != null) {
      if (meta.presentations.length === 0) {
        throw new CheckoutValidationError(
          CheckoutErrorCode.PRESENTATION_INVALID,
          `product has no presentations: ${l.productId}`,
        );
      }
      if (!meta.presentations.includes(l.presentation)) {
        throw new CheckoutValidationError(
          CheckoutErrorCode.PRESENTATION_INVALID,
          `invalid presentation for ${l.productId}: ${l.presentation}`,
        );
      }
    } else {
      // null allowed only if no presentations required? but DB has presentations array
      // still accept if empty; if product defines presentations, must be present
      // However seed: presentations can be {} empty array. If non-empty, client should send one.
      // We don't hard-fail null when array empty (harmless). If array non-empty and null, UI requires it;
      // RPC will also re-validate against DB (stronger). Keep soft here for pure layer.
    }

    // option (single primary group in seed; validate only if primary exists and value provided OR required?)
    const primary = meta.optionGroups.length > 0 ? meta.optionGroups[0] : undefined;
    if (primary) {
      if (l.selectedOption == null) {
        throw new CheckoutValidationError(
          CheckoutErrorCode.OPTION_INVALID,
          `option required for ${l.productId}`,
        );
      }
      if (!primary.values.includes(l.selectedOption)) {
        throw new CheckoutValidationError(
          CheckoutErrorCode.OPTION_INVALID,
          `invalid option for ${l.productId}: ${l.selectedOption}`,
        );
      }
    } else {
      if (l.selectedOption != null) {
        throw new CheckoutValidationError(
          CheckoutErrorCode.OPTION_INVALID,
          `product has no options: ${l.productId}`,
        );
      }
    }

    out.push({
      ...l,
      productNameSnapshot: meta.name,
      unitPriceCents: null, // resolved from DB in RPC
    });
  }
  return out;
}

/** Compute integer total cents. Returns null if ANY price is null (policy). */
export function computeTotalCents(lines: readonly { quantity: number; unitPriceCents: number | null }[]): {
  totalCents: number | null;
} {
  let sum = 0;
  let hasNull = false;
  const MAX_SAFE_INT = 2_147_483_647;
  for (const l of lines) {
    if (l.unitPriceCents == null) {
      hasNull = true;
      continue;
    }
    const p = l.unitPriceCents;
    if (p < 0) continue;
    const term = p * l.quantity;
    if (term > MAX_SAFE_INT || sum > MAX_SAFE_INT - term) {
      throw new CheckoutValidationError(CheckoutErrorCode.TOTAL_OVERFLOW, "total overflow");
    }
    sum += term;
  }
  if (hasNull) return { totalCents: null };
  return { totalCents: sum };
}

export function isCheckoutValidationError(e: unknown): e is CheckoutValidationError {
  return e instanceof CheckoutValidationError;
}