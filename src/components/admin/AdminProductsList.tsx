"use client";

import { Check, X, Loader2 } from "lucide-react";

interface AdminProductListItem {
  id: string;
  name: string;
  category_id: string;
  is_available: boolean;
  presentations: string[];
  sort_order: number;
}

interface AdminProductsListProps {
  products: AdminProductListItem[];
  isLoading: boolean;
  error: string | null;
  onToggle: (productId: string, isAvailable: boolean) => void;
  isToggling?: Record<string, boolean>;
}

const CATEGORY_LABELS: Record<string, string> = {
  pizzas: "Pizzas",
  sandwiches: "Sandwiches",
  vizcacheras: "Vizcacheras",
  licuados: "Licuados",
  cafeteria: "Cafetería",
  bebidas: "Bebidas",
  cervezas: "Cervezas",
  tragos: "Tragos",
};

export function AdminProductsList({
  products,
  isLoading,
  error,
  onToggle,
  isToggling = {},
}: AdminProductsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando productos">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
        <span className="ml-3 text-cream-dim">Cargando productos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <X className="h-12 w-12 text-cream-dim/40" aria-hidden="true" />
        <p className="mt-3 text-cream-dim">No hay productos</p>
      </div>
    );
  }

  // Group by category
  const byCategory = new Map<string, AdminProductListItem[]>();
  for (const p of products) {
    const arr = byCategory.get(p.category_id) ?? [];
    arr.push(p);
    byCategory.set(p.category_id, arr);
  }

  return (
    <div className="space-y-6" role="list" aria-label="Productos por categoría">
      {Array.from(byCategory.entries())
        .sort(([a], [b]) => {
          const aOrder = products.find((p) => p.category_id === a)?.sort_order ?? 0;
          const bOrder = products.find((p) => p.category_id === b)?.sort_order ?? 0;
          return aOrder - bOrder;
        })
        .map(([categoryId, items]) => (
          <section
            key={categoryId}
            className="rounded-xl border border-line/30 bg-ink-soft/40 p-4"
            aria-labelledby={`category-${categoryId}-heading`}
          >
            <h3
              id={`category-${categoryId}-heading`}
              className="font-display text-xl uppercase tracking-tight text-cream mb-4 flex items-center gap-2"
            >
              {CATEGORY_LABELS[categoryId] ?? categoryId}
              <span className="rounded-full bg-ink/40 px-2 py-0.5 text-xs text-cream-dim" aria-label={`${items.length} productos en esta categoría`}>
                {items.length} producto{items.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <div className="space-y-2" role="list">
              {items.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line/30 bg-ink/40 p-3 transition-colors hover:border-brand/40"
                  role="listitem"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex-shrink-0"
                      aria-hidden="true"
                      aria-label={product.is_available ? "Disponible" : "No disponible"}
                    >
                      {product.is_available ? (
                        <Check className="h-6 w-6 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <X className="h-6 w-6 text-red-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-cream truncate">{product.name}</p>
                      <p className="text-xs text-cream-dim">
                        {product.presentations.length > 0
                          ? product.presentations.join(" · ")
                          : "Sin presentación"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(product.id, !product.is_available)}
                    disabled={isToggling[product.id]}
                    className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed ${
                      product.is_available
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                    }`}
                    aria-pressed={product.is_available}
                    aria-label={product.is_available ? `Deshabilitar ${product.name}` : `Habilitar ${product.name}`}
                    aria-busy={isToggling[product.id] ? "true" : "false"}
                  >
                    {isToggling[product.id] ? (
                      <span className="flex items-center gap-1.5" aria-label="Actualizando disponibilidad">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      </span>
                    ) : product.is_available ? (
                      "Disponible"
                    ) : (
                      "No disponible"
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}