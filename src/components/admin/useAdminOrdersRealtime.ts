"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AdminOrderListItem } from "@/lib/actions/admin";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

interface UseAdminOrdersRealtimeReturn {
  connectionStatus: RealtimeConnectionStatus;
  newOrdersCount: number;
  markOrdersAsSeen: () => void;
}

/**
 * Hook para suscripción Realtime a cambios en pedidos.
 * Solo se activa para usuarios staff autenticados (la policy RLS filtra).
 * Respeta el ciclo de vida del componente: cleanup al desmontar.
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
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("connecting");
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // Sincronizar seenOrderIdsRef cuando cambian los pedidos (evitando setState en effect)
  useEffect(() => {
    // Detectar si los pedidos realmente cambiaron (contenido, no solo referencia)
    const prev = prevOrdersRef.current;
    const current = orders;
    const changed = prev.length !== current.length ||
      prev.some((o, i) => o.id !== current[i]?.id);

    if (changed) {
      seenOrderIdsRef.current = new Set(current.map((o) => o.id));
      prevOrdersRef.current = current;
    }
  }, [orders]);

  // Función para convertir payload de realtime a AdminOrderListItem
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
      items_count: 0,
    };
  }, []);

  const markOrdersAsSeen = useCallback(() => {
    // Marcar todos los pedidos actuales como vistos
    orders.forEach((o) => seenOrderIdsRef.current.add(o.id));
    setNewOrdersCount(0);
  }, [orders]);

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
              const newOrder = mapRealtimeOrder(payload);
              if (newOrder) {
                setOrders((prev) => {
                  // Evitar duplicados si ya existe (race condition)
                  if (prev.some((o) => o.id === newOrder.id)) return prev;
                  // Insertar al principio (más recientes primero)
                  return [newOrder, ...prev];
                });

                // Incrementar contador solo si es realmente nuevo (no duplicado)
                if (!seenOrderIdsRef.current.has(newOrder.id)) {
                  setNewOrdersCount((prev) => prev + 1);
                }
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedOrder = mapRealtimeOrder(payload);
              if (updatedOrder) {
                setOrders((prev) =>
                  prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                );

                // Si el detalle está abierto para este pedido, actualizarlo también
                if (isOrderDetailOpen && selectedOrderId === updatedOrder.id) {
                  const { getAdminOrderDetail } = await import("@/lib/actions/admin");
                  const result = await getAdminOrderDetail(updatedOrder.id);
                  if (result.ok) {
                    setOrderDetail(result.data);
                  }
                }
              }
            } else if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id as string | undefined;
              if (deletedId) {
                setOrders((prev) => prev.filter((o) => o.id !== deletedId));
                seenOrderIdsRef.current.delete(deletedId);
                if (isOrderDetailOpen && selectedOrderId === deletedId) {
                  setOrderDetail(null);
                }
              }
            }
          } catch (err) {
            console.error("[realtime] Error processing order change:", err);
          }
        }
      )
      .subscribe((status) => {
        if (!isMountedRef.current) return;

        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
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
  }, [orders, setOrders, selectedOrderId, setOrderDetail, isOrderDetailOpen, mapRealtimeOrder, markOrdersAsSeen]);

  return {
    connectionStatus,
    newOrdersCount,
    markOrdersAsSeen,
  };
}