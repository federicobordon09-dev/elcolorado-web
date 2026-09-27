"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AdminOrderListItem } from "@/lib/actions/admin";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type RealtimeConnectionStatus = "connecting" | "connected" | "error" | "disconnected";

interface UseAdminOrdersRealtimeProps {
  orders: AdminOrderListItem[];
  setOrders: React.Dispatch<React.SetStateAction<AdminOrderListItem[]>>;
  selectedOrderId: string | null;
  setOrderDetail: React.Dispatch<React.SetStateAction<{
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
  } | null>>;
  isOrderDetailOpen: boolean;
}

interface NewOrdersByMode {
  dine_in: number;
  takeaway: number;
}

interface NewOrderIdsByMode {
  dine_in: Set<string>;
  takeaway: Set<string>;
}

interface UseAdminOrdersRealtimeReturn {
  connectionStatus: RealtimeConnectionStatus;
  newOrdersCount: number; // total, para compatibilidad
  newOrdersByMode: NewOrdersByMode;
  newOrderIdsByMode: NewOrderIdsByMode;
  markOrdersAsSeen: () => void;
}

/**
 * Hook para suscripción Realtime a cambios en pedidos.
 * Solo se activa para usuarios staff autenticados (la policy RLS filtra).
 * Suscripción única al montar, cleanup al desmontar.
 * Retorna estado de conexión y contador de pedidos nuevos no vistos.
 */
export function useAdminOrdersRealtime({
  orders,
  setOrders,
  selectedOrderId,
  setOrderDetail,
  isOrderDetailOpen,
}: UseAdminOrdersRealtimeProps): UseAdminOrdersRealtimeReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const prevOrdersRef = useRef<AdminOrderListItem[]>([]);

  // Refs para valores que cambian frecuentemente - evitan re-suscripción
  const ordersRef = useRef(orders);
  const selectedOrderIdRef = useRef(selectedOrderId);
  const isOrderDetailOpenRef = useRef(isOrderDetailOpen);
  const setOrderDetailRef = useRef(setOrderDetail);

  // Sincronizar refs después de cada render (no durante)
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
  }, [selectedOrderId]);
  useEffect(() => {
    isOrderDetailOpenRef.current = isOrderDetailOpen;
  }, [isOrderDetailOpen]);
  useEffect(() => {
    setOrderDetailRef.current = setOrderDetail;
  }, [setOrderDetail]);

  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("connecting");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrdersByMode, setNewOrdersByMode] = useState<NewOrdersByMode>({ dine_in: 0, takeaway: 0 });
  const [newOrderIdsByMode, setNewOrderIdsByMode] = useState<NewOrderIdsByMode>({ dine_in: new Set(), takeaway: new Set() });

  // Sincronizar seenOrderIdsRef cuando cambian los pedidos (evitando setState en effect)
  useEffect(() => {
    const prev = prevOrdersRef.current;
    const current = orders;
    const changed = prev.length !== current.length ||
      prev.some((o, i) => o.id !== current[i]?.id);

    if (changed) {
      seenOrderIdsRef.current = new Set(current.map((o) => o.id));
      prevOrdersRef.current = current;
    }
  }, [orders]);

  // Mapear payload de realtime a AdminOrderListItem
  const mapRealtimeOrder = useCallback((payload: { new: Record<string, unknown> | null; old: Record<string, unknown> | null }): AdminOrderListItem | null => {
    const row = payload.new;
    if (!row) return null;

    return {
      id: row.id as string,
      order_number: row.order_number as number,
      status: row.status as AdminOrderListItem["status"],
      mode: row.mode as AdminOrderListItem["mode"],
      customer_name: row.customer_name as string,
      table_label: row.table_label as string | null,
      total_cents: row.total_cents as number | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      items_count: 0, // El conteo real se carga en el modal; realtime no trae order_items
    };
  }, []);

  const markOrdersAsSeen = useCallback(() => {
    ordersRef.current.forEach((o) => seenOrderIdsRef.current.add(o.id));
    setNewOrdersCount(0);
    setNewOrdersByMode({ dine_in: 0, takeaway: 0 });
    setNewOrderIdsByMode({ dine_in: new Set(), takeaway: new Set() });
  }, []);

  // Effect principal: SOLO se ejecuta al montar ([] deps)
  useEffect(() => {
    isMountedRef.current = true;

    const supabase = createBrowserSupabaseClient();

    // Crear canal para orders
    const channel: RealtimeChannel = supabase
      .channel("admin-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          if (!isMountedRef.current) return;

          try {
            if (payload.eventType === "INSERT") {
              // El payload INSERT solo trae columnas base de 'orders'.
              // El listado necesita items_count (subquery order_items) y otros campos computados.
              // Patrón consistente con CONFLICT en handleStatusChange y UPDATE en este hook:
              // refrescar la lista completa desde el servidor para garantizar datos completos y consistentes.
              const { listAdminOrders } = await import("@/lib/actions/admin");
              const listResult = await listAdminOrders();
              if (listResult.ok && isMountedRef.current) {
                setOrders(listResult.data);
                // Identificar pedidos realmente nuevos y separar por modo
                const freshOrders = listResult.data.filter((o) => !seenOrderIdsRef.current.has(o.id));
                if (freshOrders.length > 0) {
                  const dineInIds = freshOrders.filter((o) => o.mode === "dine_in").map((o) => o.id);
                  const takeawayIds = freshOrders.filter((o) => o.mode === "takeaway").map((o) => o.id);

                  // Actualizar seenOrderIdsRef
                  freshOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));

                  // Actualizar contadores globales y por modo
                  setNewOrdersCount((prev) => prev + freshOrders.length);
                  setNewOrdersByMode((prev) => ({
                    dine_in: prev.dine_in + dineInIds.length,
                    takeaway: prev.takeaway + takeawayIds.length,
                  }));
                  setNewOrderIdsByMode((prev) => ({
                    dine_in: new Set([...prev.dine_in, ...dineInIds]),
                    takeaway: new Set([...prev.takeaway, ...takeawayIds]),
                  }));
                }
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedOrder = mapRealtimeOrder(payload);
              if (updatedOrder) {
                setOrders((prev) =>
                  prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                );

                // Si el detalle está abierto para este pedido, actualizarlo también
                if (isOrderDetailOpenRef.current && selectedOrderIdRef.current === updatedOrder.id) {
                  // Evitar async en callback: disparar y olvidar con manejo de errores
                  void (async () => {
                    const { getAdminOrderDetail } = await import("@/lib/actions/admin");
                    const result = await getAdminOrderDetail(updatedOrder.id);
                    if (result.ok && isMountedRef.current) {
                      setOrderDetailRef.current(result.data);
                    }
                  })();
                }
              }
            } else if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id as string | undefined;
              if (deletedId) {
                setOrders((prev) => prev.filter((o) => o.id !== deletedId));
                seenOrderIdsRef.current.delete(deletedId);
                if (isOrderDetailOpenRef.current && selectedOrderIdRef.current === deletedId) {
                  setOrderDetailRef.current(null);
                }
              }
            }
          } catch (err) {
            console.error("[realtime] Error processing order change:", err);
          }
        }
      )
      .subscribe((status: string) => {
        if (!isMountedRef.current) return;

        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "SUBSCRIBING") {
          setConnectionStatus("connecting");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionStatus("error");
        }
      });

    channelRef.current = channel;

    // Cleanup al desmontar
    return () => {
      isMountedRef.current = false;
      setConnectionStatus("disconnected");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [mapRealtimeOrder, markOrdersAsSeen, setOrders]);

  return {
    connectionStatus,
    newOrdersCount,
    newOrdersByMode,
    newOrderIdsByMode,
    markOrdersAsSeen,
  };
}