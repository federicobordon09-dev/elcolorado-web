"use client";

import { useState, useCallback } from "react";
import {
  Star,
  Loader2,
  GripVertical,
  Edit,
  Archive,
  X,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/admin/Toast";

export interface AdminCategoryListItem {
  id: string;
  label: string;
  featured: boolean;
  options: Array<{ id: string; label: string; values: string[] }>;
  sort_order: number;
  products_count: number;
  updated_at: string;
}

interface AdminCategoriesListProps {
  categories: AdminCategoryListItem[];
  isLoading: boolean;
  error: string | null;
  onEdit: (category: AdminCategoryListItem) => void;
  onToggleFeatured: (category: AdminCategoryListItem) => void;
  onDelete: (category: AdminCategoryListItem) => void;
  onReorder: (order: Array<{ id: string; sort_order: number }>) => Promise<void>;
  isEditing?: Record<string, boolean>;
  isTogglingFeatured?: Record<string, boolean>;
  isDeleting?: Record<string, boolean>;
  isReordering?: boolean;
}

function formatOptionsSummary(options: AdminCategoryListItem["options"]): string {
  if (!options.length) return "Sin opciones";
  if (options.length === 1) {
    const opt = options[0];
    return `${opt.label}: ${opt.values.length} valor${opt.values.length !== 1 ? "es" : ""}`;
  }
  return `${options.length} grupos de opciones`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// Sortable item component
function SortableCategoryItem({
  category,
  isEditing,
  isTogglingFeatured,
  isDeleting,
  onEdit,
  onToggleFeatured,
  onDelete,
  isReordering,
}: {
  category: AdminCategoryListItem;
  isEditing: boolean;
  isTogglingFeatured: boolean;
  isDeleting: boolean;
  isReordering: boolean;
  onEdit: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    strategy: verticalListSortingStrategy,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-line/30 bg-ink-soft/40 p-4 transition-colors hover:border-brand/40 ${
        category.featured ? "border-amber-500/30 bg-amber-500/5" : ""
      } ${isDragging ? "shadow-lg ring-2 ring-brand/40" : "hover:border-brand/40"}`}
      role="listitem"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            className="p-1 rounded hover:bg-ink/50 transition-colors"
            aria-label={`Arrastrar ${category.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-cream-dim/40 flex-shrink-0" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-cream truncate">{category.label}</span>
              {category.featured && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/40"
                  aria-label="Destacada"
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  Destacada
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 rounded-full bg-ink/40 px-2 py-0.5 text-xs text-cream-dim"
                aria-label={`${category.products_count} producto${category.products_count !== 1 ? "s" : ""}`}
              >
                {category.products_count} producto{category.products_count !== 1 ? "s" : ""}
              </span>
            </div>

            <p className="mt-1 text-xs text-cream-dim">
              {category.sort_order > 0 && `Orden: ${category.sort_order}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isEditing || isReordering}
            className="rounded-lg border border-line/40 bg-ink/40 px-3 py-1.5 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Editar ${category.label}`}
            aria-busy={isEditing ? "true" : "false"}
          >
            {isEditing ? (
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

          <button
            type="button"
            onClick={onToggleFeatured}
            disabled={isReordering}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed ${
              category.featured
                ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
            }`}
            aria-label={category.featured ? `Quitar destacada: ${category.label}` : `Destacar: ${category.label}`}
          >
            {category.featured ? (
              <>
                <Archive className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Quitar destacada</span>
              </>
            ) : (
              <>
                <Star className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Destacar</span>
              </>
            )}
          </button>

          {/* Delete button - only enabled when no products */}
          <button
            type="button"
            onClick={onDelete}
            disabled={category.products_count > 0 || isReordering}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed ${
              category.products_count > 0
                ? "bg-ink/40 text-cream-dim border border-line/40 hover:bg-ink/50 cursor-not-allowed"
                : "bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30"
            }`}
            aria-label={category.products_count > 0
              ? `No se puede eliminar: ${category.products_count} producto${category.products_count !== 1 ? "s" : ""} asociado${category.products_count !== 1 ? "s" : ""}`
              : `Eliminar ${category.label}`}
            title={category.products_count > 0
              ? `No se puede eliminar: tiene ${category.products_count} producto${category.products_count !== 1 ? "s" : ""} asociado${category.products_count !== 1 ? "s" : ""}`
              : undefined}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-line/20 flex items-center justify-between text-xs text-cream-dim">
        <span>Actualizado: {new Date(category.updated_at).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</span>
        <code className="rounded bg-ink/60 px-1.5 font-mono text-[10px]">{category.id}</code>
      </div>
    </article>
  );
}

export function AdminCategoriesList({
  categories,
  isLoading,
  error,
  onEdit,
  onToggleFeatured,
  onDelete,
  onReorder,
  isEditing = {},
  isTogglingFeatured = {},
  isDeleting = {},
}: AdminCategoriesListProps) {
  const { success, error: showError } = useToast();
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      try {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = categories.findIndex((c) => c.id === active.id);
          const newIndex = categories.findIndex((c) => c.id === over.id);

          const newCategories = arrayMove(categories, oldIndex, newIndex);
          const newOrder = newCategories.map((cat, index) => ({
            id: cat.id,
            sort_order: index,
          }));

          // Persists server-side; parent updates local state optimistically
          // and rolls back to server truth on failure.
          await onReorder(newOrder);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "No se pudo reordenar");
      } finally {
        setIsReordering(false);
      }
    },
    [categories, onReorder, showError]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando categorías">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
        <span className="ml-3 text-cream-dim">Cargando categorías…</span>
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

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <X className="h-12 w-12 text-cream-dim/40" aria-hidden="true" />
        <p className="mt-3 text-cream-dim">No hay categorías</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setIsReordering(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setIsReordering(false)}
    >
      <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4" role="list" aria-label="Categorías">
          {categories.map((category) => (
            <SortableCategoryItem
              key={category.id}
              category={category}
              isEditing={isEditing[category.id] ?? false}
              isTogglingFeatured={isTogglingFeatured[category.id] ?? false}
              isDeleting={false}
              isReordering={isReordering}
              onEdit={() => onEdit(category)}
              onToggleFeatured={() => onToggleFeatured(category)}
              onDelete={() => onDelete(category)}
            />
          ))}
        </div>
        </SortableContext>
      </DndContext>
    );
}