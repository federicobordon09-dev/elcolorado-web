"use client";

import { useId, useState } from "react";
import type { MenuOption } from "@/lib/catalog";
import { useCart } from "./CartProvider";
import { focusRing } from "../ui";

type Props = {
  productId: string;
  productName: string;
  presentations?: readonly string[];
  optionGroups?: readonly MenuOption[];
};

/**
 * Inline add-to-cart control under a menu row.
 * - No presentations/options: single "Agregar".
 * - Presentations and/or category options: selectors appear; add stays
 *   disabled until every required selection is made (no invented values).
 * - Quantity added is always 1; further units adjust in the drawer.
 */
export function ProductAddControl({
  productId,
  productName,
  presentations,
  optionGroups,
}: Props) {
  const { add, openCart } = useCart();
  const [presentation, setPresentation] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [added, setAdded] = useState(false);

  const presId = useId();
  const optId = useId();

  const hasPresentations = presentations !== undefined && presentations.length > 0;
  const hasOptions = optionGroups !== undefined && optionGroups.length > 0;
  const needsSelection = hasPresentations || hasOptions;

  // Primary option group (seed has at most one per category).
  const primaryOption = hasOptions ? optionGroups![0] : undefined;

  const presentationOk = !hasPresentations || presentation !== "";
  const optionOk = !primaryOption || selectedOption !== "";
  const canAdd = presentationOk && optionOk;

  const handleAdd = () => {
    if (!canAdd) return;
    add({
      productId,
      presentation: hasPresentations ? presentation : null,
      selectedOption: primaryOption ? selectedOption : null,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  if (!needsSelection) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={`mt-2 rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-cream-dim transition hover:border-brand hover:text-brand-bright ${focusRing}`}
      >
        {added ? "Agregado ✓" : "Agregar"}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {hasPresentations && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-xs uppercase tracking-wide text-cream-dim">
            Presentación <span className="text-brand-bright">*</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Presentación de ${productName}`}>
            {presentations!.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                  presentation === value
                    ? "border-brand bg-brand text-white"
                    : "border-line text-cream-dim hover:border-brand hover:text-cream"
                }`}
              >
                <input
                  type="radio"
                  name={presId}
                  value={value}
                  checked={presentation === value}
                  onChange={() => setPresentation(value)}
                  className="sr-only"
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {primaryOption && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-xs uppercase tracking-wide text-cream-dim">
            {primaryOption.label} <span className="text-brand-bright">*</span>
          </legend>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={`${primaryOption.label} de ${productName}`}
          >
            {primaryOption.values.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                  selectedOption === value
                    ? "border-brand bg-brand text-white"
                    : "border-line text-cream-dim hover:border-brand hover:text-cream"
                }`}
              >
                <input
                  type="radio"
                  name={optId}
                  value={value}
                  checked={selectedOption === value}
                  onChange={() => setSelectedOption(value)}
                  className="sr-only"
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          aria-disabled={!canAdd}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
            canAdd
              ? "bg-brand text-white hover:bg-brand-bright"
              : "cursor-not-allowed bg-line text-cream-dim"
          } ${focusRing}`}
        >
          {added ? "Agregado ✓" : "Agregar"}
        </button>
        {!canAdd && (
          <span className="text-xs text-cream-dim">
            Elegí {[
              !presentationOk ? "la presentación" : null,
              !optionOk ? `el/lxs ${primaryOption?.label.toLowerCase()}` : null,
            ]
              .filter(Boolean)
              .join(" y ")}
          </span>
        )}
        {canAdd && (
          <button
            type="button"
            onClick={openCart}
            className={`text-xs text-cream-dim underline-offset-2 hover:text-brand-bright hover:underline ${focusRing}`}
          >
            Ver carrito
          </button>
        )}
      </div>
    </div>
  );
}
