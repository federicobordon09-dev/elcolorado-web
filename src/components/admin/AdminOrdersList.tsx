"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, User, Package, Truck, MapPin, Sparkles } from "lucide-react";

interface AdminOrderListItem {
  id: string;
  order_number: number;
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  mode: "dine_in" | "takeaway";
  customer_name: string;
  table_label: string | null;
  total_cents: number | null;
  created_at: string;
  updated_at: string;
  items_count: number;
}

interface AdminOrdersListProps {
  orders: AdminOrderListItem[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: "preparing" | "ready") => void;
  isUpdating?: Record<string, boolean>;
  newOrderIds?: Set<string>;
  onListInteraction?: () => void;
}

const STATUS_LABELS: Record<AdminOrderListItem["status"], string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<AdminOrderListItem["status"], string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  preparing: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  ready: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  delivered: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
};

const MODE_LABELS: Record<AdminOrderListItem["mode"], string> = {
  dine_in: "En local",
  takeaway: "Para llevar",
};

function formatTime(dateString: string): string {
  try {
    return format(new Date(dateString), "HH:mm", { locale: es });
  } catch {
    return dateString;
  }
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
  } catch {
    return dateString;
  }
}

function formatMoney(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function StatusBadge({ status }: { status: AdminOrderListItem["status"] }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}
      aria-label={`Estado: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ModeBadge({ mode }: { mode: AdminOrderListItem["mode"] }) {
  const isDineIn = mode === "dine_in";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/40 px-2 py-0.5 text-xs" aria-label={MODE_LABELS[mode]}>
      {isDineIn ? (
        <User className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Package className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {MODE_LABELS[mode]}
    </span>
  );
}

function TableLabel({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs text-cream-dim" aria-label={`Mesa: ${label}`}>
      <MapPin className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function NewIndicator() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/40 animate-pulse" aria-label="Pedido nuevo">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Nuevo
    </span>
  );
}

export function AdminOrdersList({
  orders,
  isLoading,
  error,
  onViewDetail,
  onStatusChange,
  isUpdating = {},
  newOrderIds,
  onListInteraction,
}: AdminOrdersListProps) {
  const isNewOrder = (id: string) => newOrderIds?.has(id) ?? false;

  const handleRowClick = () => {
    onListInteraction?.();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando pedidos">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent" aria-hidden="true" />
        <span className="ml-3 text-cream-dim">Cargando pedidos…</span>
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

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-cream-dim/40" aria-hidden="true" />
        <p className="mt-3 text-cream-dim">No hay pedidos</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line/30" onClick={handleRowClick}>
      <table className="w-full text-sm" role="table">
        <thead className="bg-ink/40">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Pedido</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Hora</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Modo</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Cliente</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Items</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Total</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Estado</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-cream-dim uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/20">
          {orders.map((order) => {
            const isNew = isNewOrder(order.id);
            return (
              <tr
                key={order.id}
                className={`hover:bg-ink/30 transition-colors ${isNew ? "animate-in fade-in duration-500 bg-amber-500/5" : ""}`}
                onClick={handleRowClick}
              >
                <td className="px-4 py-3 font-medium text-cream flex items-center gap-2">
                  #{order.order_number}
                  {isNew && <NewIndicator />}
                </td>
                <td className="px-4 py-3 text-cream-dim">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatDate(order.created_at)} {formatTime(order.created_at)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-cream">
                  <ModeBadge mode={order.mode} />
                </td>
                <td className="px-4 py-3 text-cream max-w-xs truncate">
                  {order.customer_name}
                  <TableLabel label={order.table_label} />
                </td>
                <td className="px-4 py-3 text-cream font-medium">
                  {order.items_count}
                </td>
                <td className="px-4 py-3 text-cream font-medium tabular-nums">
                  {formatMoney(order.total_cents)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onViewDetail(order.id); }}
                      className="rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-1.5 text-xs font-medium text-cream transition hover:bg-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
                      aria-label={`Ver detalle del pedido #${order.order_number}`}
                    >
                      Ver
                    </button>
                    {order.status === "pending" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, "preparing"); }}
                        disabled={isUpdating[order.id]}
                        className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 border border-amber-500/40 transition hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-busy={isUpdating[order.id] ? "true" : "false"}
                      >
                        {isUpdating[order.id] ? "Preparando…" : "Preparar"}
                      </button>
                    )}
                    {order.status === "preparing" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, "ready"); }}
                        disabled={isUpdating[order.id]}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-500/40 transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-busy={isUpdating[order.id] ? "true" : "false"}
                      >
                        {isUpdating[order.id] ? "Marcando listo…" : "Listo"}
                      </button>
                    )}
                    {order.status === "ready" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-cream-dim bg-ink/40" aria-label="Pedido listo, sin acciones disponibles">
                        Listo
                      </span>
                    )}
                    {order.status === "delivered" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-cream-dim bg-ink/40" aria-label="Pedido entregado">
                        <Truck className="h-3 w-3 mr-1" aria-hidden="true" />
                        Entregado
                      </span>
                    )}
                    {order.status === "cancelled" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20" aria-label="Pedido cancelado">
                        Cancelado
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}