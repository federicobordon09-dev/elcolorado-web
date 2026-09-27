"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus, Trash2, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

export interface ProductFormData {
  id: string;
  category_id: string;
  name: string;
  presentations: string[];
  sort_order: number;
  is_available: boolean;
  price_cents: number | null;
}

interface ProductFormProps {
  initialData?: ProductFormData | null;
  categories: Array<{ id: string; label: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData, expectedUpdatedAt?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  isPending: boolean;
  isDeleting?: boolean;
  mode: "create" | "edit";
  expectedUpdatedAt?: string;
}

const PRODUCT_ID_REGEX = /^[a-z0-9-]+$/;
const MAX_PRODUCT_ID_LEN = 40;
const MAX_PRODUCT_NAME_LEN = 120;
const MAX_PRESENTATION_LEN = 60;
const MAX_PRESENTATIONS_COUNT = 20;

function validateForm(data: ProductFormData, categories: Array<{ id: string; label: string }>): string[] {
  const errors: string[] = [];

  if (!data.id.trim()) {
    errors.push("El ID es obligatorio");
  } else if (data.id.length > MAX_PRODUCT_ID_LEN) {
    errors.push(`El ID no puede exceder ${MAX_PRODUCT_ID_LEN} caracteres`);
  } else if (!PRODUCT_ID_REGEX.test(data.id)) {
    errors.push("El ID solo puede contener minúsculas, números y guiones");
  }

  if (!categories.some((c) => c.id === data.category_id)) {
    errors.push("La categoría seleccionada no es válida");
  }

  if (!data.name.trim()) {
    errors.push("El nombre es obligatorio");
  } else if (data.name.length > MAX_PRODUCT_NAME_LEN) {
    errors.push(`El nombre no puede exceder ${MAX_PRODUCT_NAME_LEN} caracteres`);
  }

  if (data.sort_order < 0) {
    errors.push("El orden debe ser un número positivo");
  }

  if (data.price_cents !== null && data.price_cents !== undefined && data.price_cents < 0) {
    errors.push("El precio no puede ser negativo");
  }

  const presentationSet = new Set<string>();
  data.presentations.forEach((p, i) => {
    if (!p.trim()) {
      errors.push(`Presentación ${i + 1}: no puede estar vacía`);
    } else if (p.length > MAX_PRESENTATION_LEN) {
      errors.push(`Presentación ${i + 1}: no puede exceder ${MAX_PRESENTATION_LEN} caracteres`);
    } else if (presentationSet.has(p.trim())) {
      errors.push(`Presentación ${i + 1}: duplicada "${p.trim()}"`);
    }
    presentationSet.add(p.trim());
  });

  if (data.presentations.length > MAX_PRESENTATIONS_COUNT) {
    errors.push(`Máximo ${MAX_PRESENTATIONS_COUNT} presentaciones permitidas`);
  }

  return errors;
}

function PresentationRow({
  presentation,
  index,
  onUpdate,
  onRemove,
}: {
  presentation: string;
  index: number;
  onUpdate: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div key={index} className="flex items-center gap-2" role="listitem">
      <input
        type="text"
        value={presentation}
        onChange={(e) => onUpdate(e.target.value)}
        maxLength={MAX_PRESENTATION_LEN}
        className="flex-1 rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-1.5 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        placeholder={`Presentación ${index + 1} (ej: "500 ml", "Grande")`}
        required
        aria-required="true"
        aria-label={`Presentación ${index + 1}`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/20 text-red-300 transition-colors"
        aria-label={`Eliminar presentación ${index + 1}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

// Inner form component that remounts when key changes
function ProductFormInner({
  initialData,
  categories,
  onClose,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  mode,
  expectedUpdatedAt,
  formKey,
}: Omit<ProductFormProps, "isOpen"> & { formKey: React.Key }) {
  const { error: showError, success: showSuccess, loading: showLoading } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initial form data computed from props - pick only known fields to avoid extra props
  const initialFormData = useMemo<ProductFormData>(() => {
    if (initialData) {
      return {
        id: initialData.id,
        category_id: initialData.category_id,
        name: initialData.name,
        presentations: [...initialData.presentations],
        sort_order: initialData.sort_order,
        is_available: initialData.is_available,
        price_cents: initialData.price_cents ?? null,
      };
    }
    return {
      id: "",
      category_id: categories[0]?.id ?? "",
      name: "",
      presentations: [],
      sort_order: 0,
      is_available: true,
      price_cents: null,
    };
  }, [initialData, categories]);

  const [formData, setFormData] = useState<ProductFormData>(() => initialFormData);

  const updateField = useCallback(<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addPresentation = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      presentations: [...prev.presentations, ""],
    }));
  }, []);

  const removePresentation = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      presentations: prev.presentations.filter((_, i) => i !== index),
    }));
  }, []);

  const updatePresentation = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newPresentations = [...prev.presentations];
      newPresentations[index] = value;
      return { ...prev, presentations: newPresentations };
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, categories);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      showError(validationErrors[0]);
      return;
    }

    // Safeguard: filter out empty presentations before sending to Server Action
    // This prevents Zod INVALID_INPUT if database has empty strings
    const submitData: ProductFormData = {
      ...formData,
      presentations: formData.presentations.filter((p) => p.trim() !== ""),
    };

    setIsSubmitting(true);
    showLoading(mode === "create" ? "Creando producto…" : "Actualizando producto…");

    try {
      await onSubmit(submitData, expectedUpdatedAt);
      showSuccess(mode === "create" ? "Producto creado correctamente" : "Producto actualizado correctamente");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, categories, mode, expectedUpdatedAt, onSubmit, onClose, showError, showSuccess, showLoading]);

  return (
    <form key={formKey} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6" noValidate>
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-4" role="alert">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-300" aria-hidden="true" />
            <ul className="space-y-1 text-sm text-red-200">
              {errors.map((err, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-300 flex-shrink-0" aria-hidden="true" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={mode === "edit" ? "sm:col-span-2" : ""}>
          <label htmlFor="product-id" className="block text-xs font-medium text-cream-dim mb-1">
            ID {mode === "edit" ? "(no editable)" : "*"}
          </label>
          <input
            id="product-id"
            type="text"
            value={formData.id}
            onChange={(e) => updateField("id", e.target.value)}
            maxLength={MAX_PRODUCT_ID_LEN}
            disabled={mode === "edit"}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              mode === "edit"
                ? "bg-ink/40 text-cream-dim border-line/30 cursor-not-allowed"
                : "bg-ink-soft/60 text-cream border-line/40 placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            }`}
            placeholder="ej: pizza-mozarella"
            required={mode === "create"}
            aria-required={mode === "create"}
            aria-describedby={mode === "edit" ? "id-not-editable-hint" : undefined}
          />
          {mode === "edit" && (
            <p id="id-not-editable-hint" className="mt-1 text-xs text-cream-dim">
              El ID no se puede cambiar después de crear el producto.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="product-category" className="block text-xs font-medium text-cream-dim mb-1">
            Categoría *
          </label>
          <select
            id="product-category"
            value={formData.category_id}
            onChange={(e) => updateField("category_id", e.target.value)}
            className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            required
            aria-required="true"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className={mode === "create" ? "sm:col-span-2" : ""}>
          <label htmlFor="product-name" className="block text-xs font-medium text-cream-dim mb-1">
            Nombre *
          </label>
          <input
            id="product-name"
            type="text"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            maxLength={MAX_PRODUCT_NAME_LEN}
            className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="ej: Mozarella"
            required
            aria-required="true"
          />
        </div>

        {mode === "create" && (
          <div>
            <label htmlFor="product-sort-order" className="block text-xs font-medium text-cream-dim mb-1">
              Orden
            </label>
            <input
              id="product-sort-order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
              min={0}
              className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        )}

        <div>
          <label htmlFor="product-price" className="block text-xs font-medium text-cream-dim mb-1">
            Precio (centavos, opcional)
          </label>
          <input
            id="product-price"
            type="number"
            value={formData.price_cents ?? ""}
            onChange={(e) => updateField("price_cents", e.target.value ? parseInt(e.target.value) : null)}
            min={0}
            className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="ej: 12500 (=$125.00)"
            aria-describedby="price-hint"
          />
          <p id="price-hint" className="mt-1 text-xs text-cream-dim">
            Dejar vacío para «Sin precio». Precio en centavos (ej: 12500 = $125.00).
          </p>
        </div>

        <div>
          <label htmlFor="product-available" className="block text-xs font-medium text-cream-dim mb-1">
            Disponible
          </label>
          <div className="relative">
            <input
              id="product-available"
              type="checkbox"
              checked={formData.is_available}
              onChange={(e) => updateField("is_available", e.target.checked)}
              className="sr-only peer"
            />
            <label
              htmlFor="product-available"
              className="inline-flex items-center justify-center w-10 h-6 rounded-full bg-ink/40 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand/60 peer-checked:bg-brand peer-checked:border-brand border border-line/40 transition-colors cursor-pointer"
              aria-label={formData.is_available ? "Desactivar producto" : "Activar producto"}
            >
              <span className="inline-block w-4 h-4 rounded-full bg-cream peer-checked:translate-x-5 transition-transform" aria-hidden="true" />
            </label>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-cream">Presentaciones</h3>
          <button
            type="button"
            onClick={addPresentation}
            disabled={isPending || isSubmitting || formData.presentations.length >= MAX_PRESENTATIONS_COUNT}
            className="flex items-center gap-1.5 rounded-lg border border-line/40 bg-ink/40 px-3 py-1.5 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Agregar presentación"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar presentación
          </button>
        </div>

        {formData.presentations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line/30 bg-ink/30 p-6 text-center">
            <p className="text-cream-dim">No hay presentaciones definidas. Agrega al menos una (ej: «500 ml», «Grande»).</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto" role="list" aria-label="Presentaciones del producto">
            {formData.presentations.map((presentation, index) => (
              <PresentationRow
                key={index}
                presentation={presentation}
                index={index}
                onUpdate={(value) => updatePresentation(index, value)}
                onRemove={() => removePresentation(index)}
              />
            ))}
          </div>
        )}

        {formData.presentations.length >= MAX_PRESENTATIONS_COUNT && (
          <p className="mt-2 text-xs text-cream-dim">
            Límite de {MAX_PRESENTATIONS_COUNT} presentaciones alcanzado.
          </p>
        )}
      </div>

      {expectedUpdatedAt && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300" role="status">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>Control de concurrencia activo: se enviará <code className="rounded bg-ink/60 px-1">updated_at</code> original para detectar conflictos.</span>
          </div>
        </div>
      )}

      <footer className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-line/30">
        {mode === "edit" && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending || isSubmitting || isDeleting}
            className="rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 px-4 py-2 text-sm font-medium transition hover:bg-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={isDeleting ? "true" : "false"}
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Eliminando…
              </span>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Eliminar producto</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending || isSubmitting || isDeleting}
          className="rounded-lg border border-line/40 bg-ink/40 px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || isSubmitting || isDeleting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-bright focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isSubmitting ? "true" : "false"}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {mode === "create" ? "Creando…" : "Guardando…"}
            </span>
          ) : (
            mode === "create" ? "Crear producto" : "Guardar cambios"
          )}
        </button>
      </footer>
    </form>
  );
}

export function ProductForm({
  initialData,
  categories,
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  mode,
  expectedUpdatedAt,
}: ProductFormProps) {
  // Generate a key that changes when initialData or mode changes while dialog is open
  const formKey = useMemo(() => {
    if (!isOpen) return 0;
    const dataStr = initialData
      ? `${initialData.id}|${initialData.category_id}|${initialData.name}|${JSON.stringify(initialData.presentations)}|${initialData.sort_order}|${initialData.is_available}|${initialData.price_cents}`
      : "create";
    return `${mode}|${dataStr}`;
  }, [isOpen, initialData, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-line/30 bg-ink-soft/95 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4 duration-200 flex flex-col">
        <header className="flex items-center justify-between border-b border-line/30 px-6 py-4">
          <h2 id="product-form-title" className="font-display text-xl uppercase tracking-tight text-cream">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-shrink-0 p-1 rounded hover:bg-ink/50 text-cream-dim transition-colors disabled:opacity-50"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <ProductFormInner
          formKey={formKey}
          initialData={initialData}
          categories={categories}
          onClose={onClose}
          onSubmit={onSubmit}
          onDelete={onDelete}
          isPending={isPending}
          isDeleting={isDeleting}
          mode={mode}
          expectedUpdatedAt={expectedUpdatedAt}
        />
      </div>
    </div>
  );
}