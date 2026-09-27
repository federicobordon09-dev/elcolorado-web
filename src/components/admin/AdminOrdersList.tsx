"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  User,
  Truck,
  Utensils,
  Package,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import {
  getAdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderDetail,
} from "@/lib/actions/admin";

type OrderStatus = AdminOrderListItem["status"];
type OrderMode = AdminOrderListItem["mode"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  preparing: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  ready: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  delivered: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
};

// Left accent bar per status (row hierarchy — never the only cue: badge text always present)
const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending: "border-l-amber-500",
  preparing: "border-l-blue-500",
  ready: "border-l-emerald-500",
  delivered: "border-l-slate-500",
  cancelled: "border-l-red-500",
};

const MODE_LABELS: Record<OrderMode, string> = {
  dine_in: "En el local",
  takeaway: "Delivery",
};

const MODE_ICONS: Record<OrderMode, React.ReactNode> = {
  dine_in: <Utensils className="h-3.5 w-3.5" aria-hidden="true" />,
  takeaway: <Truck className="h-3.5 w-3.5" aria-hidden="true" />,
};

const MODE_EMPTY_MESSAGES: Record<OrderMode, string> = {
  dine_in: "No hay pedidos en el local",
  takeaway: "No hay pedidos de delivery",
};

type StatusFilter = "all" | OrderStatus;
type ModeTab = OrderMode;

interface AdminOrdersListProps {
  orders: AdminOrderListItem[];
  isLoading: boolean;
  error: string | null;
  onViewDetail: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: "preparing" | "ready") => void;
  isUpdating?: Record<string, boolean>;
  newOrderIds?: Set<string>;
  modeTab?: "dine_in" | "takeaway";
  onModeTabChange?: (mode: "dine_in" | "takeaway") => void;
  onListInteraction?: () => void;
}

// ─── Lazy per-row detail (products / quantities) ───

type DetailState =
  | { status: "loading" }
  | { status: "ready"; data: AdminOrderDetail }
  | { status: "error" };

// ─── Formatters ───

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    return sameDay
      ? format(date, "HH:mm", { locale: es })
      : format(date, "dd/MM HH:mm", { locale: es });
  } catch {
    return dateString;
  }
}

function formatMoney(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Small pieces ───

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
      aria-label={`Estado: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function NewIndicator() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300 animate-pulse"
      aria-label="Pedido nuevo"
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Nuevo
    </span>
  );
}

function ModeCountBadge({ count, isActive }: { count: number; isActive: boolean }) {
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        isActive ? "bg-ink/20 text-ink" : "bg-ink/60 text-cream-dim"
      }`}
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

// ─── Segmented control: EN EL LOCAL | DELIVERY ───

function ModeTabs({
  value,
  counts,
  onChange,
}: {
  value: ModeTab;
  counts: Record<ModeTab, number>;
  onChange: (mode: ModeTab) => void;
}) {
  const tabs: { id: ModeTab; label: string; icon: React.ReactNode }[] = [
    { id: "dine_in", label: MODE_LABELS.dine_in, icon: MODE_ICONS.dine_in },
    { id: "takeaway", label: MODE_LABELS.takeaway, icon: MODE_ICONS.takeaway },
  ];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
      onChange(tabs[next].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Tipo de pedido"
      className="inline-flex gap-1 rounded-lg border border-line/40 bg-ink-soft/40 p-1"
    >
      {tabs.map((tab, index) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`orders-mode-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls="orders-mode-panel"
            aria-label={`${tab.label}, ${counts[tab.id]} pedido${counts[tab.id] !== 1 ? "s" : ""}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60 sm:px-4 ${
              isActive
                ? "bg-brand text-ink"
                : "text-cream-dim hover:bg-ink/40 hover:text-cream"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <ModeCountBadge count={counts[tab.id]} isActive={isActive} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Expandable products panel (lazy detail) ───

function ItemsPanel({
  orderId,
  state,
  onRetry,
}: {
  orderId: string;
  state: DetailState | undefined;
  onRetry: () => void;
}) {
  const panelId = `order-items-${orderId}`;

  if (!state || state.status === "loading") {
    return (
      <div
        id={panelId}
        role="status"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 border-t border-line/20 bg-ink/60 px-3 py-3 text-sm text-cream-dim"
      >
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
          aria-hidden="true"
        />
        Cargando productos…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        id={panelId}
        role="alert"
        onClick={(e) => e.stopPropagation()}
        className="flex flex-wrap items-center justify-between gap-2 border-t border-line/20 bg-red-500/10 px-3 py-3 text-sm text-red-200"
      >
        <span>No se pudieron cargar los productos del pedido.</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-400/40 bg-ink/40 px-3 py-1 text-xs font-medium text-cream transition hover:bg-ink/60 focus:outline-none focus:ring-2 focus:ring-red-400/60"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const items = state.data.items;
  return (
    <div
      id={panelId}
      onClick={(e) => e.stopPropagation()}
      className="border-t border-line/20 bg-ink/60 px-3 py-2"
    >
      {items.length === 0 ? (
        <p className="py-2 text-sm text-cream-dim">Sin productos registrados.</p>
      ) : (
        <ul role="list" className="divide-y divide-line/10">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-sm"
            >
              <span className="min-w-0 text-cream">
                <span className="font-semibold tabular-nums">{item.quantity}×</span>{" "}
                {item.product_name_snapshot}
                {(item.presentation || item.selected_option) && (
                  <span className="text-cream-dim">
                    {" "}
                    ({[item.presentation, item.selected_option].filter(Boolean).join(" · ")})
                  </span>
                )}
                {item.note && (
                  <span className="block text-xs italic text-cream-dim">Nota: {item.note}</span>
                )}
              </span>
              <span className="shrink-0 tabular-nums text-cream-dim">
                {item.unit_price_cents === null
                  ? "—"
                  : formatMoney(item.unit_price_cents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 text-right text-sm font-semibold tabular-nums text-cream">
        Total {formatMoney(state.data.total_cents)}
      </p>
    </div>
  );
}

// ─── Compact order row ───

function OrderRow({
  order,
  isNew,
  isExpanded,
  detailState,
  onViewDetail,
  onToggleExpand,
  onRetryDetail,
  onStatusChange,
  isUpdating,
}: {
  order: AdminOrderListItem;
  isNew: boolean;
  isExpanded: boolean;
  detailState: DetailState | undefined;
  onViewDetail: () => void;
  onToggleExpand: () => void;
  onRetryDetail: () => void;
  onStatusChange: (newStatus: "preparing" | "ready") => void;
  isUpdating: boolean;
}) {
  const canPrepare = order.status === "pending";
  const canReady = order.status === "preparing";
  const isTerminal = order.status === "delivered" || order.status === "cancelled";
  const itemsPanelId = `order-items-${order.id}`;

  return (
    <article
      role="listitem"
      className={`rounded-lg border border-line/30 border-l-[3px] bg-ink/40 transition-colors hover:bg-ink/50 ${STATUS_ACCENT[order.status]} ${
        isNew ? "animate-in fade-in duration-500 border-amber-500/60" : ""
      }`}
      onClick={onViewDetail}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        {/* Expand / collapse products */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-expanded={isExpanded}
          aria-controls={itemsPanelId}
          aria-label={`${
            isExpanded ? "Ocultar" : "Ver"
          } productos del pedido #${order.order_number}`}
          className="shrink-0 rounded-md p-1 text-cream-dim transition hover:bg-ink/60 hover:text-cream focus:outline-none focus:ring-2 focus:ring-brand/60"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Order number (keyboard-accessible path to detail) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
          className="shrink-0 rounded font-display text-base font-medium text-cream transition hover:text-brand-bright focus:outline-none focus:ring-2 focus:ring-brand/60"
          aria-label={`Ver detalle del pedido #${order.order_number}`}
        >
          #{order.order_number}
        </button>

        <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-cream-dim">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTime(order.created_at)}
        </span>

        {isNew && <NewIndicator />}

        <span
          className="min-w-0 max-w-[10rem] truncate text-sm font-medium text-cream sm:max-w-none"
          title={order.customer_name}
        >
          <User className="mr-1 inline h-3.5 w-3.5 text-cream-dim" aria-hidden="true" />
          {order.customer_name}
        </span>

        {/* Mode-specific data (dine-in: table) */}
        {order.mode === "dine_in" && order.table_label && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line/40 bg-ink/60 px-2 py-0.5 text-xs text-cream-dim">
            {MODE_ICONS.dine_in}
            {order.table_label}
          </span>
        )}

        <span className="shrink-0 text-xs text-cream-dim">
          {order.items_count} ítem{order.items_count !== 1 ? "s" : ""}
        </span>

        <span className="shrink-0 text-sm font-semibold tabular-nums text-cream">
          {formatMoney(order.total_cents)}
        </span>

        {/* Right cluster: status + actions */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <StatusBadge status={order.status} />

          {canPrepare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange("preparing");
              }}
              disabled={isUpdating}
              className="whitespace-nowrap rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/60 disabled:cursor-not-allowed disabled:opacity-50"
              aria-busy={isUpdating ? "true" : "false"}
            >
              {isUpdating ? "Preparando…" : "Preparar"}
            </button>
          )}

          {canReady && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange("ready");
              }}
              disabled={isUpdating}
              className="whitespace-nowrap rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50"
              aria-busy={isUpdating ? "true" : "false"}
            >
              {isUpdating ? "Marcando listo…" : "Listo"}
            </button>
          )}

          {isTerminal && (
            <span className="sr-only">
              {order.status === "delivered" ? "Pedido entregado" : "Pedido cancelado"}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail();
            }}
            className="whitespace-nowrap rounded-lg border border-line/40 bg-ink-soft/60 px-3 py-1.5 text-xs font-medium text-cream transition hover:bg-ink-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
            aria-label={`Ver detalle del pedido #${order.order_number}`}
          >
            Detalle
          </button>
        </div>
      </div>

      {isExpanded && (
        <ItemsPanel orderId={order.id} state={detailState} onRetry={onRetryDetail} />
      )}
    </article>
  );
}

// ─── Status filter (preserved from previous design) ───

function StatusFilterSelect({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos los estados" },
    { value: "pending", label: "Pendiente" },
    { value: "preparing", label: "Preparando" },
    { value: "ready", label: "Listo" },
    { value: "delivered", label: "Entregado" },
    { value: "cancelled", label: "Cancelado" },
  ];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StatusFilter)}
        className="appearance-none rounded-lg border border-line/40 bg-ink-soft/60 py-2 pl-3 pr-10 text-sm font-medium text-cream focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        aria-label="Filtrar por estado"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Per-tab empty state ───

function ModeEmptyState({
  mode,
  statusFilter,
  otherCount,
  onSwitchMode,
}: {
  mode: ModeTab;
  statusFilter: StatusFilter;
  otherCount: number;
  onSwitchMode: () => void;
}) {
  const otherMode: ModeTab = mode === "dine_in" ? "takeaway" : "dine_in";
  const filtered = statusFilter !== "all";

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line/20 bg-ink/30 py-10 text-center">
      <Package className="h-10 w-10 text-cream-dim/40" aria-hidden="true" />
      <p className="mt-3 text-cream-dim">
        {filtered
          ? `No hay pedidos «${STATUS_LABELS[statusFilter]}» ${mode === "dine_in" ? "en el local" : "de delivery"}`
          : MODE_EMPTY_MESSAGES[mode]}
      </p>
      {otherCount > 0 && (
        <button
          type="button"
          onClick={onSwitchMode}
          className="mt-4 rounded-lg border border-brand/40 bg-brand/20 px-4 py-2 text-sm font-medium text-brand-bright transition hover:bg-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/60"
        >
          Ver {MODE_LABELS[otherMode]} ({otherCount})
        </button>
      )}
    </div>
  );
}

// ─── Main list ───

export function AdminOrdersList({
  orders,
  isLoading,
  error,
  onViewDetail,
  onStatusChange,
  isUpdating = {},
  newOrderIds,
  modeTab = "dine_in",
  onModeTabChange,
  onListInteraction,
}: AdminOrdersListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  const handleListClick = () => {
    onListInteraction?.();
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const dineInOrders = useMemo(
    () => filteredOrders.filter((o) => o.mode === "dine_in"),
    [filteredOrders]
  );
  const takeawayOrders = useMemo(
    () => filteredOrders.filter((o) => o.mode === "takeaway"),
    [filteredOrders]
  );

  const loadDetail = useCallback(async (orderId: string) => {
    setDetails((prev) => ({ ...prev, [orderId]: { status: "loading" } }));
    try {
      const result = await getAdminOrderDetail(orderId);
      setDetails((prev) => ({
        ...prev,
        [orderId]: result.ok
          ? { status: "ready", data: result.data }
          : { status: "error" },
      }));
    } catch {
      setDetails((prev) => ({ ...prev, [orderId]: { status: "error" } }));
    }
  }, []);

  const handleToggleExpand = useCallback(
    (orderId: string) => {
      if (expandedId === orderId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(orderId);
      if (!details[orderId]) {
        void loadDetail(orderId);
      }
    },
    [expandedId, details, loadDetail]
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-label="Cargando pedidos"
      >
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent"
          aria-hidden="true"
        />
        <span className="ml-3 text-cream-dim">Cargando pedidos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        onClick={handleListClick}
      >
        <Package className="h-12 w-12 text-cream-dim/40" aria-hidden="true" />
        <p className="mt-3 text-cream-dim">No hay pedidos</p>
      </div>
    );
  }

  const activeOrders = modeTab === "dine_in" ? dineInOrders : takeawayOrders;
  const otherOrders = modeTab === "dine_in" ? takeawayOrders : dineInOrders;
  const isNewOrder = (id: string) => newOrderIds?.has(id) ?? false;

  return (
    <div className="space-y-4" onClick={handleListClick}>
      {/* Header: title + status filter */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl uppercase tracking-tight text-cream">Pedidos</h2>
          {statusFilter !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/20 px-2 py-0.5 text-xs font-medium text-brand-bright">
              Filtrado: {STATUS_LABELS[statusFilter]}
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="ml-1 rounded p-0.5 transition-colors hover:bg-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/60"
                aria-label="Limpiar filtro de estado"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
        <StatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
      </header>

      {/* Segmented control: EN EL LOCAL | DELIVERY */}
      <ModeTabs value={modeTab} counts={{ dine_in: dineInOrders.length, takeaway: takeawayOrders.length }} onChange={onModeTabChange ?? (() => {})} />

      {/* Tab panel: only one mode rendered at a time */}
      <div
        role="tabpanel"
        id="orders-mode-panel"
        aria-labelledby={`orders-mode-tab-${modeTab}`}
        tabIndex={0}
        className="rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        {activeOrders.length === 0 ? (
          <ModeEmptyState
            mode={modeTab}
            statusFilter={statusFilter}
            otherCount={otherOrders.length}
            onSwitchMode={() =>
              onModeTabChange?.(modeTab === "dine_in" ? "takeaway" : "dine_in")
            }
          />
        ) : (
          <div className="space-y-2" role="list" aria-label={`Pedidos ${MODE_LABELS[modeTab]}`}>
            {activeOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                isNew={isNewOrder(order.id)}
                isExpanded={expandedId === order.id}
                detailState={details[order.id]}
                onViewDetail={() => onViewDetail(order.id)}
                onToggleExpand={() => handleToggleExpand(order.id)}
                onRetryDetail={() => void loadDetail(order.id)}
                onStatusChange={(newStatus) => onStatusChange(order.id, newStatus)}
                isUpdating={isUpdating[order.id] ?? false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
