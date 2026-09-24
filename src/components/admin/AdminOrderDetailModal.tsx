"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, MapPin, User, Package, Clock } from "lucide-react";

interface AdminOrderDetail {
  id: string;
  order_number: number;
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  mode: "dine_in" | "takeaway";
  customer_name: string;
  customer_phone: string | null;
  table_label: string | null;
  total_cents: number | null;
  created_at: string;
  updated_at: string;
  items: {
    id: string;
    product_name_snapshot: string;
    presentation: string | null;
    selected_option: string | null;
    quantity: number;
    unit_price_cents: number | null;
    note: string | null;
    created_at: string;
  }[];
}

interface AdminOrderDetailProps {
  order: AdminOrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: "preparing" | "ready") => void;
  isUpdating?: boolean;
}

const STATUS_LABELS: Record<AdminOrderDetail["status"], string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<AdminOrderDetail["status"], string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  preparing: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  ready: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  delivered: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
};

const MODE_LABELS: Record<AdminOrderDetail["mode"], string> = {
  dine_in: "En local",
  takeaway: "Para llevar",
};

function formatMoney(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return dateString;
  }
}

export function AdminOrderDetailModal({ order, isOpen, onClose, onStatusChange, isUpdating }: AdminOrderDetailProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management and Escape key
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Trap focus within modal
      const modal = modalRef.current;
      if (modal) {
        // Focus first focusable element
        const focusable = modal.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const canPrepare = order.status === "pending";
  const canReady = order.status === "preparing";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-ink/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-line/40 bg-ink-soft/95 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-line/30 bg-ink/40 p-4">
          <div>
            <h2 id="order-detail-title" className="font-display text-2xl uppercase tracking-tight text-cream">
              Pedido #{order.order_number}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-cream-dim">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`} aria-label={`Estado: ${STATUS_LABELS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/40 px-2 py-0.5 text-xs" aria-label={MODE_LABELS[order.mode]}>
                {order.mode === "dine_in" ? (
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Package className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {MODE_LABELS[order.mode]}
              </span>
              {order.table_label && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/40 px-2 py-0.5 text-xs text-cream-dim" aria-label={`Mesa: ${order.table_label}`}>
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Mesa: {order.table_label}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line/40 bg-ink/40 p-2 text-cream-dim transition hover:bg-ink/60 focus:outline-none focus:ring-2 focus:ring-brand/60"
            aria-label="Cerrar detalle del pedido"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4">
          {/* Customer info */}
          <section className="mb-6 rounded-lg border border-line/30 bg-ink/40 p-4" aria-labelledby="customer-info-heading">
            <h3 id="customer-info-heading" className="font-display text-lg uppercase tracking-tight text-cream mb-3">Información del cliente</h3>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-cream-dim">Nombre</dt>
                <dd className="text-cream font-medium">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-cream-dim">Teléfono</dt>
                <dd className="text-cream">{order.customer_phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-cream-dim">Creado</dt>
                <dd className="text-cream">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDateTime(order.created_at)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-cream-dim">Actualizado</dt>
                <dd className="text-cream">{formatDateTime(order.updated_at)}</dd>
              </div>
            </dl>
          </section>

          {/* Items */}
          <section className="mb-6" aria-labelledby="items-heading">
            <h3 id="items-heading" className="font-display text-lg uppercase tracking-tight text-cream mb-3">Productos ({order.items.length})</h3>
            {order.items.length === 0 ? (
              <p className="text-cream-dim text-center py-4">Este pedido no tiene productos</p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item) => (
                  <article key={item.id} className="rounded-lg border border-line/30 bg-ink/40 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-cream">{item.product_name_snapshot}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-cream-dim">
                          <span>Cant: <span className="text-cream font-medium">{item.quantity}</span></span>
                          {item.presentation && (
                            <span>Presentación: <span className="text-cream">{item.presentation}</span></span>
                          )}
                          {item.selected_option && (
                            <span>Opción: <span className="text-cream">{item.selected_option}</span></span>
                          )}
                          <span>Precio unit.: <span className="text-cream">{formatMoney(item.unit_price_cents)}</span></span>
                        </div>
                      </div>
                    </div>
                    {item.note && (
                      <div className="mt-2 rounded bg-ink/60 px-3 py-2 text-sm text-cream-dim">
                        <span className="font-medium text-cream">Nota:</span> {item.note}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Total */}
          <section className="rounded-lg border border-line/30 bg-ink/40 p-4" aria-labelledby="total-heading">
            <h3 id="total-heading" className="sr-only">Total del pedido</h3>
            <div className="flex items-center justify-between">
              <span className="font-display text-xl uppercase tracking-tight text-cream">Total</span>
              <span className="font-display text-2xl text-cream tabular-nums">{formatMoney(order.total_cents)}</span>
            </div>
            {order.total_cents === null && (
              <p className="mt-1 text-xs text-cream-dim">Los precios no están disponibles (price_cents = NULL en DB)</p>
            )}
          </section>
        </div>

        {/* Footer actions */}
        {(canPrepare || canReady) && (
          <footer className="flex items-center justify-end gap-3 border-t border-line/30 bg-ink/40 p-4">
            {canPrepare && (
              <button
                type="button"
                onClick={() => onStatusChange(order.id, "preparing")}
                disabled={isUpdating}
                className="rounded-lg bg-amber-500/20 px-4 py-2 font-medium text-amber-300 border border-amber-500/40 transition hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isUpdating ? "true" : "false"}
              >
                {isUpdating ? "Marcando como Preparando…" : "Marcar como Preparando"}
              </button>
            )}
            {canReady && (
              <button
                type="button"
                onClick={() => onStatusChange(order.id, "ready")}
                disabled={isUpdating}
                className="rounded-lg bg-emerald-500/20 px-4 py-2 font-medium text-emerald-300 border border-emerald-500/40 transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isUpdating ? "true" : "false"}
              >
                {isUpdating ? "Marcando como Listo…" : "Marcar como Listo"}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}