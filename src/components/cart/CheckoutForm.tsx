"use client";

import { useId, useState, useTransition } from "react";
import type { CartLine } from "@/lib/cart-logic";
import type { CreateOrderResult } from "@/lib/actions/create-order";
import { focusRing } from "../ui";

export type CheckoutPayload = {
  lines: readonly CartLine[];
  customerName: string;
  customerPhone: string;
  mode: "dine_in" | "takeaway";
  tableLabel: string;
};

type Props = {
  lines: readonly CartLine[];
  onSubmit: (payload: CheckoutPayload) => Promise<CreateOrderResult>;
  onSuccess: (r: CreateOrderResult) => void;
  onError: (code: string, message: string) => void;
  disabled: boolean;
  submitting?: boolean;
};

export function CheckoutForm({ lines, onSubmit, onSuccess, onError, disabled, submitting }: Props) {
  const nameId = useId();
  const phoneId = useId();
  const modeId = useId();
  const tableId = useId();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"dine_in" | "takeaway">("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const pending = isPending || submitting === true;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled || pending) return;
    startTransition(async () => {
      const payload: CheckoutPayload = {
        lines,
        customerName,
        customerPhone,
        mode,
        tableLabel,
      };
      const res = await onSubmit(payload);
      if (res.ok) onSuccess(res);
      else onError(res.code, res.message);
    });
  };

  return (
    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-3 border-0 p-0">
        <legend className="mb-1 text-xs uppercase tracking-wide text-cream-dim">Modo</legend>
        <div className="flex gap-2" role="radiogroup" aria-labelledby={modeId}>
          <label
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
              mode === "dine_in"
                ? "border-brand bg-brand text-white"
                : "border-line text-cream-dim hover:border-brand hover:text-cream"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="dine_in"
              checked={mode === "dine_in"}
              onChange={() => setMode("dine_in")}
              className="sr-only"
            />
            En mesa
          </label>
          <label
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
              mode === "takeaway"
                ? "border-brand bg-brand text-white"
                : "border-line text-cream-dim hover:border-brand hover:text-cream"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="takeaway"
              checked={mode === "takeaway"}
              onChange={() => setMode("takeaway")}
              className="sr-only"
            />
            Para llevar
          </label>
        </div>
      </fieldset>
      <div>
        <label htmlFor={nameId} className="mb-1 block text-xs uppercase tracking-wide text-cream-dim">
          Nombre <span className="text-brand-bright">*</span>
        </label>
        <input
          id={nameId}
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={80}
          placeholder="Tu nombre"
          className={`w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 ${focusRing}`}
        />
      </div>
      <div>
        <label htmlFor={phoneId} className="mb-1 block text-xs uppercase tracking-wide text-cream-dim">
          Teléfono (opcional)
        </label>
        <input
          id={phoneId}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          maxLength={30}
          placeholder="Ej.: 1160000000"
          className={`w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 ${focusRing}`}
        />
      </div>
      {mode === "dine_in" && (
        <div>
          <label htmlFor={tableId} className="mb-1 block text-xs uppercase tracking-wide text-cream-dim">
            Mesa <span className="text-brand-bright">*</span>
          </label>
          <input
            id={tableId}
            required
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
            maxLength={40}
            placeholder="Ej.: Mesa 4"
            className={`w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 ${focusRing}`}
          />
        </div>
      )}
      <p className="text-xs text-cream-dim">Confirmás tu pedido: el total se confirma en barra.</p>
    </form>
  );
}
