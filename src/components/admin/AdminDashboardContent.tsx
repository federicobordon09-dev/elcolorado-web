"use client";

import { useState, useCallback, useEffect } from "react";
import { Wifi, WifiOff, Bell, CheckCircle2 } from "lucide-react";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";
import { AdminOrderDetailModal } from "@/components/admin/AdminOrderDetailModal";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { useToast } from "@/components/admin/Toast";
import { useAdminOrdersRealtime, type RealtimeConnectionStatus } from "@/components/admin/useAdminOrdersRealtime";
import {
  getAdminOrderDetail,
  updateOrderStatus,
  toggleProductAvailability,
  listAdminOrders,
  listAdminProducts,
  type AdminOrderListItem,
  type AdminProductListItem,
  type AdminOrderDetail,
} from "@/lib/actions/admin";

interface AdminDashboardContentProps {
  initialOrders: AdminOrderListItem[];
  initialOrdersError: string | null;
  initialProducts: AdminProductListItem[];
  initialProductsError: string | null;
}

const CONNECTION_STATUS_LABELS: Record<RealtimeConnectionStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  error: "Error de conexión",
  disconnected: "Desconectado",
};

const CONNECTION_STATUS_ICONS: Record<RealtimeConnectionStatus, React.ReactNode> = {
  connecting: <Wifi className="h-4 w-4 animate-pulse" aria-hidden="true" />,
  connected: <Wifi className="h-4 w-4 text-emerald-400" aria-hidden="true" />,
  error: <WifiOff className="h-4 w-4 text-amber-400" aria-hidden="true" />,
  disconnected: <WifiOff className="h-4 w-4 text-cream-dim" aria-hidden="true" />,
};

const CONNECTION_STATUS_COLORS: Record<RealtimeConnectionStatus, string> = {
  connecting: "text-amber-400",
  connected: "text-emerald-400",
  error: "text-amber-400",
  disconnected: "text-cream-dim",
};

export function AdminDashboardContent({
  initialOrders,
  initialOrdersError,
  initialProducts,
  initialProductsError,
}: AdminDashboardContentProps) {
  const [orders, setOrders] = useState<AdminOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<AdminProductListItem[]>(initialProducts);
  const [ordersError] = useState<string | null>(initialOrdersError);
  const [productsError] = useState<string | null>(initialProductsError);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isUpdatingOrder, setIsUpdatingOrder] = useState<Record<string, boolean>>({});
  const [isTogglingProduct, setIsTogglingProduct] = useState<Record<string, boolean>>({});

  const { success, error: showError } = useToast();

  const isOrderDetailOpen = selectedOrderId !== null;

  // Suscripción Realtime a cambios en pedidos
  const { connectionStatus, newOrdersCount, markOrdersAsSeen } = useAdminOrdersRealtime({
    orders,
    setOrders,
    selectedOrderId,
    setOrderDetail,
    isOrderDetailOpen,
  });

  // Marcar como vistos cuando el usuario interactúa con la lista o entra al panel
  const handleOrdersListInteraction = useCallback(() => {
    if (newOrdersCount > 0) {
      markOrdersAsSeen();
    }
  }, [newOrdersCount, markOrdersAsSeen]);

  // También marcar como vistos al abrir/cerrar el modal de detalle
  useEffect(() => {
    if (isOrderDetailOpen && newOrdersCount > 0) {
      markOrdersAsSeen();
    }
  }, [isOrderDetailOpen, newOrdersCount, markOrdersAsSeen]);

  const handleViewDetail = useCallback(async (orderId: string) => {
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setIsLoadingDetail(true);

    const result = await getAdminOrderDetail(orderId);

    if (result.ok) {
      setOrderDetail(result.data);
    } else {
      showError(result.message);
      setSelectedOrderId(null);
    }
    setIsLoadingDetail(false);
  }, [showError]);

  const handleCloseDetail = useCallback(() => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  }, []);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: "preparing" | "ready") => {
    // Find current status for optimistic locking
    const currentOrder = orders.find((o) => o.id === orderId);
    const expectedStatus = currentOrder?.status;

    setIsUpdatingOrder((prev) => ({ ...prev, [orderId]: true }));

    const result = await updateOrderStatus({ orderId, newStatus, expectedStatus });

    setIsUpdatingOrder((prev) => ({ ...prev, [orderId]: false }));

    if (result.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: result.data.status, updated_at: result.data.updated_at } : o
        )
      );
      if (orderDetail?.id === orderId) {
        setOrderDetail((prev) => (prev ? { ...prev, status: result.data.status, updated_at: result.data.updated_at } : null));
      }

      const statusLabel = newStatus === "preparing" ? "Preparando" : "Listo";
      success(`Pedido movido a ${statusLabel}`);
    } else if (result.code === "CONFLICT") {
      // Conflict: another admin modified the order. Refresh from server.
      showError(result.message);
      // Refetch the order list to get current state
      const listResult = await listAdminOrders();
      if (listResult.ok) {
        setOrders(listResult.data);
      }
    } else {
      showError(result.message);
    }
  }, [orders, orderDetail, showError, success]);

  const handleToggleProduct = useCallback(async (productId: string, isAvailable: boolean) => {
    // Find current availability for optimistic locking
    const currentProduct = products.find((p) => p.id === productId);
    const expectedAvailable = currentProduct?.is_available;

    setIsTogglingProduct((prev) => ({ ...prev, [productId]: true }));

    const result = await toggleProductAvailability({ productId, isAvailable, expectedAvailable });

    setIsTogglingProduct((prev) => ({ ...prev, [productId]: false }));

    if (result.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, is_available: result.data.is_available, updated_at: result.data.updated_at } : p
        )
      );
      success(result.data.is_available ? "Producto habilitado" : "Producto deshabilitado");
    } else if (result.code === "CONFLICT") {
      showError(result.message);
      const listResult = await listAdminProducts();
      if (listResult.ok) {
        setProducts(listResult.data);
      }
    } else {
      showError(result.message);
    }
  }, [products, showError, success]);

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-ink-soft/95 border px-3 py-2 shadow-lg backdrop-blur-sm">
        {CONNECTION_STATUS_ICONS[connectionStatus]}
        <span className={`text-xs font-medium ${CONNECTION_STATUS_COLORS[connectionStatus]}`}>
          {CONNECTION_STATUS_LABELS[connectionStatus]}
        </span>
        {connectionStatus === "error" && (
          <span className="text-xs text-cream-dim">(Reintentando…)</span>
        )}
      </div>

      {/* New Orders Counter */}
      {newOrdersCount > 0 && (
        <button
          type="button"
          onClick={handleOrdersListInteraction}
          className="fixed bottom-16 left-4 z-40 flex items-center gap-2 rounded-lg bg-brand px-3 py-2 shadow-lg animate-in slide-in-from-bottom-4 duration-200"
          aria-label={`${newOrdersCount} pedido${newOrdersCount !== 1 ? "s" : ""} nuevo${newOrdersCount !== 1 ? "s" : ""}`}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">
            {newOrdersCount} nuevo{newOrdersCount !== 1 ? "s" : ""}
          </span>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <AdminOrdersList
        orders={orders}
        isLoading={false}
        error={ordersError}
        onViewDetail={handleViewDetail}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdatingOrder}
        newOrderIds={newOrdersCount > 0 ? new Set(orders.slice(0, newOrdersCount).map(o => o.id)) : undefined}
        onListInteraction={handleOrdersListInteraction}
      />

      <AdminProductsList
        products={products}
        isLoading={false}
        error={productsError}
        onToggle={handleToggleProduct}
        isToggling={isTogglingProduct}
      />

      <AdminOrderDetailModal
        order={orderDetail}
        isOpen={selectedOrderId !== null}
        onClose={handleCloseDetail}
        onStatusChange={handleStatusChange}
        isUpdating={isLoadingDetail || (selectedOrderId ? isUpdatingOrder[selectedOrderId] : false)}
      />
    </>
  );
}