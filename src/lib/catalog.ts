import "server-only";

import type { MenuCategory, MenuOption, MenuProduct } from "@/lib/menu";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Public menu catalog read layer (Phase 2).
 *
 * - Server-only: never reachable from a client bundle.
 * - Uses the request-scoped SSR client (publishable key + RLS) — the service
 *   role key is never involved in public catalog reads.
 * - Exactly two queries per request (categories + products) via Promise.all;
 *   no per-category or per-product follow-up queries (no N+1).
 * - Explicit mapper into the existing `MenuCategory` / `MenuProduct` /
 *   `MenuOption` contract consumed by the render path. `src/lib/menu.ts` stays
 *   the seed/transcription source only and is NOT imported at runtime here
 *   (types only, via `import type`).
 * - `products.is_available = false` rows are excluded; a category with zero
 *   available products is omitted entirely (no empty section, no invented data).
 * - Failures throw an explicit error — there is NO silent fallback to
 *   `menu.ts` and no fabricated catalog.
 * - `price_cents` is intentionally never selected: prices stay out of the
 *   public UI until the business provides them (approved decision 7).
 */

// Re-export the shared render contract so components depend on this module
// (and not on the seed file) for types. Value imports of `menuCategories`
// are forbidden on the render path.
export type { MenuCategory, MenuOption, MenuProduct };

type CategoryRow = {
  id: string;
  label: string;
  featured: boolean;
  options: unknown;
  sort_order: number;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  presentations: string[];
  sort_order: number;
  is_available: boolean;
};

/** Narrow unknown jsonb to the `MenuOption` shape; invalid entries are dropped. */
function mapOptions(value: unknown): MenuOption[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const options: MenuOption[] = [];
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { id?: unknown }).id === "string" &&
      typeof (entry as { label?: unknown }).label === "string" &&
      Array.isArray((entry as { values?: unknown }).values) &&
      ((entry as { values: unknown[] }).values).every(
        (v) => typeof v === "string",
      )
    ) {
      const typed = entry as { id: string; label: string; values: string[] };
      options.push({
        id: typed.id,
        label: typed.label,
        values: typed.values,
      });
    }
  }

  return options.length > 0 ? options : undefined;
}

function mapProduct(row: ProductRow): MenuProduct {
  const presentations =
    Array.isArray(row.presentations) && row.presentations.length > 0
      ? row.presentations
      : undefined;

  return {
    id: row.id,
    name: row.name,
    ...(presentations ? { presentations } : {}),
  };
}

function mapCategory(
  row: CategoryRow,
  productsByCategory: Map<string, MenuProduct[]>,
): MenuCategory | undefined {
  const products = productsByCategory.get(row.id) ?? [];
  if (products.length === 0) return undefined; // hide fully unavailable categories

  const options = mapOptions(row.options);

  return {
    id: row.id,
    label: row.label,
    ...(row.featured ? { featured: true } : {}),
    products,
    ...(options ? { options } : {}),
  };
}

/**
 * Load the public menu catalog from Supabase.
 *
 * @throws {Error} when Supabase env vars are missing, either query fails, or
 * the response shape is unusable — never silently substitutes seed data.
 */
export async function getMenuCatalog(): Promise<MenuCategory[]> {
  const supabase = await createServerSupabaseClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, label, featured, options, sort_order")
      .order("sort_order", { ascending: true })
      .returns<CategoryRow[]>(),
    supabase
      .from("products")
      .select(
        "id, category_id, name, presentations, sort_order, is_available",
      )
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .returns<ProductRow[]>(),
  ]);

  if (categoriesResult.error) {
    console.error(
      "[catalog] categories query failed:",
      categoriesResult.error.message,
      categoriesResult.error.code,
    );
    throw new Error("Menu catalog unavailable: failed to load categories.");
  }

  if (productsResult.error) {
    console.error(
      "[catalog] products query failed:",
      productsResult.error.message,
      productsResult.error.code,
    );
    throw new Error("Menu catalog unavailable: failed to load products.");
  }

  const categories = categoriesResult.data ?? [];
  const products = productsResult.data ?? [];

  const productsByCategory = new Map<string, MenuProduct[]>();
  for (const row of products) {
    const bucket = productsByCategory.get(row.category_id);
    const mapped = mapProduct(row);
    if (bucket) {
      bucket.push(mapped);
    } else {
      productsByCategory.set(row.category_id, [mapped]);
    }
  }

  const catalog: MenuCategory[] = [];
  for (const row of categories) {
    const mapped = mapCategory(row, productsByCategory);
    if (mapped) catalog.push(mapped);
  }

  return catalog;
}
