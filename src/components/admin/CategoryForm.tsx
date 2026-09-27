"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus, Trash2, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

export interface CategoryOption {
  id: string;
  label: string;
  values: string[];
}

interface CategoryFormData {
  id: string;
  label: string;
  featured: boolean;
  sort_order: number;
  options: CategoryOption[];
}

interface CategoryFormProps {
  initialData?: CategoryFormData | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData, expectedUpdatedAt?: string) => Promise<void>;
  isPending: boolean;
  mode: "create" | "edit";
  expectedUpdatedAt?: string;
}

const MAX_ID_LEN = 40;
const MAX_LABEL_LEN = 80;
const MAX_OPTION_ID_LEN = 40;
const MAX_OPTION_LABEL_LEN = 80;
const MAX_OPTION_VALUE_LEN = 60;

function validateForm(data: CategoryFormData): string[] {
  const errors: string[] = [];

  if (!data.id.trim()) {
    errors.push("El ID es obligatorio");
  } else if (data.id.length > MAX_ID_LEN) {
    errors.push(`El ID no puede exceder ${MAX_ID_LEN} caracteres`);
  } else if (!/^[a-z0-9-]+$/.test(data.id)) {
    errors.push("El ID solo puede contener minúsculas, números y guiones");
  }

  if (!data.label.trim()) {
    errors.push("El nombre es obligatorio");
  } else if (data.label.length > MAX_LABEL_LEN) {
    errors.push(`El nombre no puede exceder ${MAX_LABEL_LEN} caracteres`);
  }

  if (data.sort_order < 0) {
    errors.push("El orden debe ser un número positivo");
  }

  const optionIds = new Set<string>();
  data.options.forEach((opt, optIndex) => {
    if (!opt.id.trim()) {
      errors.push(`Opción ${optIndex + 1}: el ID es obligatorio`);
    } else if (opt.id.length > MAX_OPTION_ID_LEN) {
      errors.push(`Opción ${optIndex + 1}: el ID no puede exceder ${MAX_OPTION_ID_LEN} caracteres`);
    } else if (optionIds.has(opt.id)) {
      errors.push(`Opción ${optIndex + 1}: ID duplicado "${opt.id}"`);
    }
    optionIds.add(opt.id);

    if (!opt.label.trim()) {
      errors.push(`Opción "${opt.id}": el nombre es obligatorio`);
    } else if (opt.label.length > MAX_OPTION_LABEL_LEN) {
      errors.push(`Opción "${opt.id}": el nombre no puede exceder ${MAX_OPTION_LABEL_LEN} caracteres`);
    }

    if (!opt.values.length) {
      errors.push(`Opción "${opt.id}": debe tener al menos un valor`);
    }
    opt.values.forEach((v, vIndex) => {
      if (!v.trim()) {
        errors.push(`Opción "${opt.id}", valor ${vIndex + 1}: no puede estar vacío`);
      } else if (v.length > MAX_OPTION_VALUE_LEN) {
        errors.push(`Opción "${opt.id}", valor ${vIndex + 1}: no puede exceder ${MAX_OPTION_VALUE_LEN} caracteres`);
      }
    });

    const valueSet = new Set<string>();
    opt.values.forEach((v) => {
      if (valueSet.has(v.trim())) {
        errors.push(`Opción "${opt.id}": valor duplicado "${v.trim()}"`);
      }
      valueSet.add(v.trim());
    });
  });

  return errors;
}

function OptionRow({
  option,
  index,
  onUpdate,
  onRemove,
  onAddValue,
  onRemoveValue,
  onValueChange,
}: {
  option: CategoryOption;
  index: number;
  onUpdate: (updates: Partial<CategoryOption>) => void;
  onRemove: () => void;
  onAddValue: () => void;
  onRemoveValue: (valueIndex: number) => void;
  onValueChange: (valueIndex: number, value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <fieldset className="rounded-lg border border-line/30 bg-ink/40 p-4" aria-labelledby={`option-${index}-legend`}>
      <legend id={`option-${index}-legend`} className="font-medium text-cream mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-ink/50 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`option-${index}-content`}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span>Opción {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto p-1 rounded hover:bg-red-500/20 text-red-300 transition-colors"
          aria-label={`Eliminar opción ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </legend>

      <div id={`option-${index}-content`} hidden={!isExpanded}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`option-id-${index}`} className="block text-xs font-medium text-cream-dim mb-1">
                ID de la opción *
              </label>
              <input
                id={`option-id-${index}`}
                type="text"
                value={option.id}
                onChange={(e) => onUpdate({ id: e.target.value })}
                maxLength={MAX_OPTION_ID_LEN}
                className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="ej: preparacion"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor={`option-label-${index}`} className="block text-xs font-medium text-cream-dim mb-1">
                Nombre *
              </label>
              <input
                id={`option-label-${index}`}
                type="text"
                value={option.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                maxLength={MAX_OPTION_LABEL_LEN}
                className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="ej: Preparación"
                required
                aria-required="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-cream-dim">Valores</label>
              <button
                type="button"
                onClick={onAddValue}
                className="flex items-center gap-1 rounded-lg border border-line/40 bg-ink/40 px-2 py-1 text-xs font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40"
                aria-label="Agregar valor"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar
              </button>
            </div>

            {option.values.length === 0 && (
              <p className="text-xs text-cream-dim/60 text-center py-2">Sin valores. Agrega al menos uno.</p>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto" role="list" aria-label={`Valores de ${option.label}`}>
              {option.values.map((value, valueIndex) => (
                <div key={valueIndex} className="flex items-center gap-2" role="listitem">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onValueChange(valueIndex, e.target.value)}
                    maxLength={MAX_OPTION_VALUE_LEN}
                    className="flex-1 rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-1.5 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                    placeholder={`Valor ${valueIndex + 1}`}
                    required
                    aria-required="true"
                    aria-label={`Valor ${valueIndex + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveValue(valueIndex)}
                    className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/20 text-red-300 transition-colors"
                    aria-label={`Eliminar valor ${valueIndex + 1}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

// Inner form component that remounts when key changes
function CategoryFormInner({
  initialData,
  onClose,
  onSubmit,
  isPending,
  mode,
  expectedUpdatedAt,
  formKey,
}: Omit<CategoryFormProps, "isOpen"> & { formKey: React.Key }) {
  const { error: showError, success: showSuccess, loading: showLoading } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initial form data computed from props - useMemo ensures stable reference
  const initialFormData = useMemo<CategoryFormData>(() => {
    if (initialData) {
      return {
        ...initialData,
        options: initialData.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          values: [...opt.values],
        })),
      };
    }
    return {
      id: "",
      label: "",
      featured: false,
      sort_order: 0,
      options: [],
    };
  }, [initialData]);

  // Use functional state initialization - only runs on mount
  const [formData, setFormData] = useState<CategoryFormData>(() => initialFormData);

  // Reset form when formKey changes by using key on form element
  // This useEffect only runs when formKey changes, which means remount
  // The key on the form element handles the actual reset

  const updateField = useCallback(<K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateOption = useCallback((index: number, updates: Partial<CategoryOption>) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], ...updates };
      return { ...prev, options: newOptions };
    });
  }, []);

  const addOption = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { id: `opt${prev.options.length + 1}`, label: "", values: [] }],
    }));
  }, []);

  const removeOption = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }, []);

  const addValue = useCallback((optionIndex: number) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        values: [...newOptions[optionIndex].values, ""],
      };
      return { ...prev, options: newOptions };
    });
  }, []);

  const removeValue = useCallback((optionIndex: number, valueIndex: number) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        values: newOptions[optionIndex].values.filter((_, i) => i !== valueIndex),
      };
      return { ...prev, options: newOptions };
    });
  }, []);

  const changeValue = useCallback((optionIndex: number, valueIndex: number, value: string) => {
    setFormData((prev) => {
      const newOptions = [...prev.options];
      const newValues = [...newOptions[optionIndex].values];
      newValues[valueIndex] = value;
      newOptions[optionIndex] = { ...newOptions[optionIndex], values: newValues };
      return { ...prev, options: newOptions };
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      showError(validationErrors[0]);
      return;
    }

    setIsSubmitting(true);
    showLoading(mode === "create" ? "Creando categoría…" : "Actualizando categoría…");

    try {
      await onSubmit(formData, expectedUpdatedAt);
      showSuccess(mode === "create" ? "Categoría creada correctamente" : "Categoría actualizada correctamente");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, mode, expectedUpdatedAt, onSubmit, onClose, showError, showSuccess, showLoading]);

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
          <label htmlFor="category-id" className="block text-xs font-medium text-cream-dim mb-1">
            ID {mode === "edit" ? "(no editable)" : "*"}
          </label>
          <input
            id="category-id"
            type="text"
            value={formData.id}
            onChange={(e) => updateField("id", e.target.value)}
            maxLength={MAX_ID_LEN}
            disabled={mode === "edit"}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              mode === "edit"
                ? "bg-ink/40 text-cream-dim border-line/30 cursor-not-allowed"
                : "bg-ink-soft/60 text-cream border-line/40 placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            }`}
            placeholder="ej: pizzas"
            required={mode === "create"}
            aria-required={mode === "create"}
            aria-describedby={mode === "edit" ? "id-not-editable-hint" : undefined}
          />
          {mode === "edit" && (
            <p id="id-not-editable-hint" className="mt-1 text-xs text-cream-dim">
              El ID no se puede cambiar después de crear la categoría.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="category-label" className="block text-xs font-medium text-cream-dim mb-1">
            Nombre *
          </label>
          <input
            id="category-label"
            type="text"
            value={formData.label}
            onChange={(e) => updateField("label", e.target.value)}
            maxLength={MAX_LABEL_LEN}
            className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream placeholder-cream-dim/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="ej: Pizzas"
            required
            aria-required="true"
          />
        </div>

        {mode === "create" && (
          <div>
            <label htmlFor="category-sort-order" className="block text-xs font-medium text-cream-dim mb-1">
              Orden
            </label>
            <input
              id="category-sort-order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
              min={0}
              className="w-full rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-2 text-sm text-cream focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        )}

        <div>
          <label htmlFor="category-featured" className="block text-xs font-medium text-cream-dim mb-1">
            Destacada
          </label>
          <div className="relative">
            <input
              id="category-featured"
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => updateField("featured", e.target.checked)}
              className="sr-only peer"
            />
            <label
              htmlFor="category-featured"
              className="inline-flex items-center justify-center w-10 h-6 rounded-full bg-ink/40 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand/60 peer-checked:bg-brand peer-checked:border-brand border border-line/40 transition-colors cursor-pointer"
              aria-label={formData.featured ? "Desmarcar como destacada" : "Marcar como destacada"}
            >
              <span className="inline-block w-4 h-4 rounded-full bg-cream peer-checked:translate-x-5 transition-transform" aria-hidden="true" />
            </label>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-cream">Opciones (grupos de valores)</h3>
          <button
            type="button"
            onClick={addOption}
            disabled={isPending || isSubmitting}
            className="flex items-center gap-1.5 rounded-lg border border-line/40 bg-ink/40 px-3 py-1.5 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Agregar opción"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar opción
          </button>
        </div>

        {formData.options.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line/30 bg-ink/30 p-6 text-center">
            <p className="text-cream-dim">No hay opciones definidas. Agrega al menos una si la categoría necesita opciones.</p>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Opciones de la categoría">
            {formData.options.map((option, index) => (
              <OptionRow
                key={option.id || index}
                option={option}
                index={index}
                onUpdate={(updates) => updateOption(index, updates)}
                onRemove={() => removeOption(index)}
                onAddValue={() => addValue(index)}
                onRemoveValue={(valueIndex) => removeValue(index, valueIndex)}
                onValueChange={(valueIndex, value) => changeValue(index, valueIndex, value)}
              />
            ))}
          </div>
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
        <button
          type="button"
          onClick={onClose}
          disabled={isPending || isSubmitting}
          className="rounded-lg border border-line/40 bg-ink/40 px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink/50 hover:border-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || isSubmitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-bright focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isSubmitting ? "true" : "false"}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {mode === "create" ? "Creando…" : "Guardando…"}
            </span>
          ) : (
            mode === "create" ? "Crear categoría" : "Guardar cambios"
          )}
        </button>
      </footer>
    </form>
  );
}

export function CategoryForm({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  isPending,
  mode,
  expectedUpdatedAt,
}: CategoryFormProps) {
  // Generate a key that changes when initialData or mode changes while dialog is open
  // Using useMemo to derive key from props - no setState in effect needed
  const formKey = useMemo(() => {
    if (!isOpen) return 0;
    // Create a stable key from the relevant props
    const dataStr = initialData
      ? `${initialData.id}|${initialData.label}|${initialData.featured}|${initialData.sort_order}|${JSON.stringify(initialData.options)}`
      : "create";
    return `${mode}|${dataStr}`;
  }, [isOpen, initialData, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-line/30 bg-ink-soft/95 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4 duration-200 flex flex-col">
        <header className="flex items-center justify-between border-b border-line/30 px-6 py-4">
          <h2 id="category-form-title" className="font-display text-xl uppercase tracking-tight text-cream">
            {mode === "create" ? "Nueva categoría" : "Editar categoría"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending || false}
            className="flex-shrink-0 p-1 rounded hover:bg-ink/50 text-cream-dim transition-colors disabled:opacity-50"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <CategoryFormInner
          formKey={formKey}
          initialData={initialData}
          onClose={onClose}
          onSubmit={onSubmit}
          isPending={isPending}
          mode={mode}
          expectedUpdatedAt={expectedUpdatedAt}
        />
      </div>
    </div>
  );
}