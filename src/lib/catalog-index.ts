import type { MenuCategory, MenuOption, MenuProduct } from "@/lib/catalog";

/**
 * Lightweight, serializable index of the live catalog for cart UI.
 * Built on the server from the same `getMenuCatalog()` result that renders
 * the carta — never re-fetched from the client, never trusted for money.
 */

export type CatalogProductMeta = {
  id: string;
  name: string;
  /** Presentations when the product has them (required before add). */
  presentations: readonly string[];
  /** Option groups that apply to this product (category-scoped in seed). */
  optionGroups: readonly MenuOption[];
};

export type CatalogIndex = {
  products: ReadonlyMap<string, CatalogProductMeta>;
  productIds: ReadonlySet<string>;
};

export function buildCatalogIndex(
  catalog: readonly MenuCategory[],
): CatalogIndex {
  const products = new Map<string, CatalogProductMeta>();

  for (const category of catalog) {
    const optionGroups = category.options ?? [];
    for (const product of category.products as readonly MenuProduct[]) {
      products.set(product.id, {
        id: product.id,
        name: product.name,
        presentations: product.presentations ?? [],
        optionGroups,
      });
    }
  }

  return {
    products,
    productIds: new Set(products.keys()),
  };
}

/** JSON-safe shape for client component props (Map/Set are not serializable). */
export type CatalogIndexDTO = {
  entries: CatalogProductMeta[];
};

export function toCatalogIndexDTO(index: CatalogIndex): CatalogIndexDTO {
  return { entries: [...index.products.values()] };
}

export function fromCatalogIndexDTO(dto: CatalogIndexDTO): CatalogIndex {
  const products = new Map<string, CatalogProductMeta>();
  for (const entry of dto.entries) {
    products.set(entry.id, entry);
  }
  return {
    products,
    productIds: new Set(products.keys()),
  };
}
