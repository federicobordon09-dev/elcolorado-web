"use client";

import { Check, X, Loader2, Edit, Archive, RotateCcw, Trash2 } from "lucide-react";

export interface AdminProductListItem {
  id: string;
  name: string;
  category_id: string;
  category_label: string;
  is_available: boolean;
  presentations: string[];
  sort_order: number;
  price_cents: number | null;
  updated_at: string;
}

interface AdminProductsListProps {
  products: AdminProductListItem[];
  isLoading: boolean;
  error: string | null;
  onToggle: (productId: string, isAvailable: boolean) => void;
  onEdit: (product: AdminProductListItem) => void;
  onArchive: (product: AdminProductListItem) => void;
  onDelete: (product: AdminProductListItem) => void;
  isToggling?: Record<string, boolean>;
  isEditing?: Record<string, boolean>;
  isArchiving?: Record<string, boolean>;
  isDeleting?: Record<string, boolean>;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "Sin precio";
  return `$${(cents / 100).toFixed(2)}`;
}

export function AdminProductsList({
  products,
  isLoading,
  error,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  isToggling = {},
  isEditing = {},
  isArchiving = {},
  isDeleting = {},
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
              {items[0]?.category_label ?? categoryId}
              <span className="rounded-full bg-ink/40 px-2 py-0.5 text-xs text-cream-dim" aria-label={`${items.length} productos en esta categoría`}>
                {items.length} producto{items.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <div className="space-y-2" role="list">
              {items.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border border-line/30 bg-ink/40 p-3 transition-colors hover:border-brand/40 ${
                    !product.is_available ? "opacity-60 bg-red-500/5 border-red-500/20" : ""
                  }`}
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
                        {product.price_cents !== null && ` • ${formatPrice(product.price_cents)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      disabled={isEditing[product.id] || isArchiving[product.id] || isToggling[product.id]}
                      className="rounded-lg border border-line/40 bg-ink/40 px-3 py-1.5 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Editar ${product.name}`}
                      aria-busy={isEditing[product.id] ? "true" : "false"}
                    >
                      {isEditing[product.id] ? (
                        <span className="flex items-center gap-1.5" aria-label="Editando">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        </span>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Editar</span>
                        </>
                      )}
                    </button>

                    {product.is_available ? (
                      <button
                        type="button"
                        onClick={() => onArchive(product)}
                        disabled={isArchiving[product.id] || isEditing[product.id] || isToggling[product.id]}
                        className="rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1.5 text-sm font-medium transition hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Desactivar ${product.name}`}
                        aria-busy={isArchiving[product.id] ? "true" : "false"}
                      >
                        {isArchiving[product.id] ? (
                          <span className="flex items-center gap-1.5" aria-label="Desactivando">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          </span>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Desactivar</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggle(product.id, true)}
                        disabled={isToggling[product.id] || isEditing[product.id] || isArchiving[product.id]}
                        className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 text-sm font-medium transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Activar ${product.name}`}
                        aria-busy={isToggling[product.id] ? "true" : "false"}
                      >
                        {isToggling[product.id] ? (
                          <span className="flex items-center gap-1.5" aria-label="Activando">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          </span>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Activar</span>
                          </>
                        )}
                      </button>
                    )}
                    {/* Delete button - always visible, destructive */}
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      disabled={isDeleting[product.id] || isEditing[product.id] || isArchiving[product.id] || isToggling[product.id]}
                      className="rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 px-3 py-1.5 text-sm font-medium transition hover:bg-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Eliminar ${product.name}`}
                      aria-busy={isDeleting[product.id] ? "true" : "false"}
                    >
                      {isDeleting[product.id] ? (
                        <span className="flex items-center gap-1.5" aria-label="Eliminando">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        </span>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}