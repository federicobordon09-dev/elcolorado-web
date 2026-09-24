"use client";

import { useEffect, useId, useRef, useState } from "react";
import { lineKey, MAX_NOTE_LENGTH, MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart-logic";
import { useCart } from "./CartProvider";
import { useCatalogIndex } from "./CatalogProvider";
import { CloseIcon } from "../icons";
import { focusRing } from "../ui";
import { CheckoutForm, type CheckoutPayload } from "./CheckoutForm";
import { createOrder, type CreateOrderResult } from "@/lib/actions/create-order";

type LineStatus = "available" | "unavailable";

/**
 * Slide-over cart drawer.
 * - Mobile: full-height panel from the right (primary flow).
 * - Desktop: fixed right panel max-w-md.
 * - States: empty, lines, unavailable lines, disabled future checkout CTA.
 * - Total: always "Total a confirmar" (no prices in catalog yet).
 */
export function CartDrawer() {
  const {
    lines,
    hydrated,
    isOpen,
    closeCart,
    updateQuantity,
    updateNote,
    remove,
    clear,
  } = useCart();
  const catalog = useCatalogIndex();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CreateOrderResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Focus close control on open; restore is left to the trigger browser default.
  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
      wasOpen.current = true;
    }
  }, [isOpen]);

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!hydrated || !isOpen) return null;

  const hasUnavailable = lines.some(
    (line) => !catalog.productIds.has(line.productId),
  );

  const handleCloseCart = () => {
    setShowCheckout(false);
    setSuccess(null);
    setError(null);
    setSubmitting(false);
    closeCart();
  };

  const handleSubmitCheckout = async (payload: CheckoutPayload): Promise<CreateOrderResult> => {
    setSubmitting(true);
    setError(null);
    const full = {
      lines: payload.lines,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone || null,
      mode: payload.mode,
      tableLabel: payload.mode === "dine_in" && payload.tableLabel ? payload.tableLabel : null,
    };
    const res = await createOrder(full);
    setSubmitting(false);
    return res;
  };

  const handleSuccess = (r: CreateOrderResult) => {
    if (r.ok) {
      setSuccess(r);
      clear();
      setShowCheckout(false);
    } else {
      setError({ code: r.code, message: r.message });
    }
  };

  const handleError = (code: string, message: string) => {
    setError({ code, message });
  };

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Cerrar carrito"
        tabIndex={-1}
        onClick={handleCloseCart}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/70 backdrop-blur-sm"
      />
      <aside
        id="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ink shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6">
          <h2
            id={titleId}
            className="font-display text-2xl uppercase tracking-wide text-cream"
          >
            Tu carrito
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={handleCloseCart}
            aria-label="Cerrar carrito"
            className={`rounded-md p-2 text-cream transition-colors hover:text-brand-bright ${focusRing}`}
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {success && success.ok ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-xl uppercase text-cream">Pedido creado</p>
              <p className="text-sm text-cream-dim">
                Número de orden: <span className="font-semibold text-cream">{success.orderNumber}</span>
              </p>
              <p className="text-xs text-cream-dim break-all">Token: {success.publicToken}</p>
              <button
                type="button"
                onClick={handleCloseCart}
                className={`mt-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-bright ${focusRing}`}
              >
                Cerrar
              </button>
            </div>
          ) : lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-xl uppercase text-cream">Tu carrito está vacío</p>
              <p className="text-sm text-cream-dim">Agregá productos desde la carta para armar tu pedido.</p>
              <button
                type="button"
                onClick={handleCloseCart}
                className={`mt-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-bright ${focusRing}`}
              >
                Ver la carta
              </button>
            </div>
          ) : (
            <>
              {hasUnavailable && (
                <p role="status" className="mb-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-cream">
                  Algunos productos ya no están disponibles. Quitalos para continuar.
                </p>
              )}
              {error && (
                <p role="alert" className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-cream">
                  {error.message || error.code}
                </p>
              )}
              {!showCheckout && (
                <ul className="space-y-4">
                  {lines.map((line) => {
                    const key = lineKey(line);
                    const meta = catalog.products.get(line.productId);
                    const status: LineStatus = meta ? "available" : "unavailable";
                    const name = meta?.name ?? line.productId;
                    return (
                      <li
                        key={key}
                        className={`rounded-xl border p-3 ${
                          status === "unavailable" ? "border-brand/50 bg-ink-soft/80" : "border-line bg-ink-soft"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium leading-snug text-cream">{name}</p>
                            {(line.presentation || line.selectedOption) && (
                              <p className="mt-0.5 text-sm text-cream-dim">
                                {[line.presentation, line.selectedOption].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {status === "unavailable" && (
                              <p className="mt-1 text-sm font-medium text-brand-bright">No disponible</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(key)}
                            className={`shrink-0 rounded text-sm text-cream-dim transition-colors hover:text-brand-bright ${focusRing}`}
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={`Cantidad de ${name}`}>
                            <button
                              type="button"
                              disabled={status === "unavailable"}
                              onClick={() => updateQuantity(key, Math.max(MIN_QUANTITY, line.quantity - 1))}
                              aria-label="Restar uno"
                              className={`px-3 py-1.5 text-cream disabled:opacity-40 ${focusRing}`}
                            >
                              −
                            </button>
                            <span aria-live="polite" className="min-w-8 text-center text-sm tabular-nums text-cream">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={status === "unavailable" || line.quantity >= MAX_QUANTITY}
                              onClick={() => updateQuantity(key, Math.min(MAX_QUANTITY, line.quantity + 1))}
                              aria-label="Sumar uno"
                              className={`px-3 py-1.5 text-cream disabled:opacity-40 ${focusRing}`}
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-cream-dim">
                            {MIN_QUANTITY}–{MAX_QUANTITY}
                          </span>
                        </div>
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs uppercase tracking-wide text-cream-dim">Nota (opcional)</span>
                          <textarea
                            value={line.note}
                            maxLength={MAX_NOTE_LENGTH}
                            disabled={status === "unavailable"}
                            onChange={(e) => updateNote(key, e.target.value)}
                            rows={2}
                            placeholder="Ej.: sin cebolla"
                            className={`w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 disabled:opacity-50 ${focusRing}`}
                          />
                          <span className="mt-1 block text-right text-xs tabular-nums text-cream-dim">
                            {line.note.length}/{MAX_NOTE_LENGTH}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {showCheckout && (
                <CheckoutForm
                  lines={lines}
                  onSubmit={handleSubmitCheckout}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  disabled={hasUnavailable || submitting}
                  submitting={submitting}
                />
              )}
            </>
          )}
        </div>

        {lines.length > 0 && !success && (
          <footer className="border-t border-line px-4 py-4 sm:px-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="text-sm text-cream-dim">Total</span>
              <span className="font-display text-xl uppercase tracking-wide text-cream">Total a confirmar</span>
            </div>
            {!showCheckout ? (
              <button
                type="button"
                disabled={hasUnavailable || submitting}
                onClick={() => {
                  setError(null);
                  setShowCheckout(true);
                }}
                className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition ${
                  hasUnavailable || submitting
                    ? "cursor-not-allowed bg-line text-cream-dim"
                    : "bg-brand text-white hover:bg-brand-bright"
                } ${focusRing}`}
              >
                Finalizar pedido
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={hasUnavailable || submitting}
                onClick={(e) => {
                  const form = (e.currentTarget.closest("aside") as HTMLElement)?.querySelector("form");
                  if (form) {
                    e.preventDefault();
                    form.requestSubmit();
                  }
                }}
                className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition ${
                  hasUnavailable || submitting
                    ? "cursor-not-allowed bg-line text-cream-dim"
                    : "bg-brand text-white hover:bg-brand-bright"
                } ${focusRing}`}
              >
                {submitting ? "Enviando..." : "Confirmar pedido"}
              </button>
            )}
            <p className="mt-2 text-center text-xs text-cream-dim">Sin cargo todavía</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
