"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { listAdminCategories } from "@/lib/actions/admin";
import type { AdminCategoryListItem } from "@/lib/actions/admin";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type RealtimeConnectionStatus = "connecting" | "connected" | "error" | "disconnected";

interface UseAdminCategoriesRealtimeProps {
  categories: AdminCategoryListItem[];
  setCategories: React.Dispatch<React.SetStateAction<AdminCategoryListItem[]>>;
}

interface UseAdminCategoriesRealtimeReturn {
  connectionStatus: RealtimeConnectionStatus;
}

/**
 * Hook para suscripción Realtime a cambios en categorías y productos
 * que afectan al contador de productos por categoría en el panel Admin.
 *
 * - Escucha INSERT/UPDATE/DELETE en `categories` y `products`.
 * - Para products: reacciona a cambios que afectan el contador por categoría
 *   (INSERT, DELETE, UPDATE en category_id o is_available).
 * - Para categories: reacciona a INSERT/UPDATE/DELETE para refrescar la lista completa.
 * - Usa debounce (150ms) para agrupar eventos consecutivos.
 * - Llama a listAdminCategories() para obtener la lista fresca con conteos actualizados.
 * - No muestra toasts ni interrumpe la UI.
 * - Limpieza correcta al desmontar.
 */
export function useAdminCategoriesRealtime({
  categories,
  setCategories,
}: UseAdminCategoriesRealtimeProps): UseAdminCategoriesRealtimeReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const setCategoriesRef = useRef(setCategories);

  // Sincronizar setCategories ref después de cada render
  useEffect(() => {
    setCategoriesRef.current = setCategories;
  }, [setCategories]);

  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("connecting");

  // Debounce para agrupar eventos consecutivos
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      try {
        const result = await listAdminCategories();
        if (result.ok && isMountedRef.current) {
          setCategoriesRef.current(result.data);
        } else if (!result.ok) {
          console.error("[admin-categories-realtime] Failed to refresh categories:", result.message);
        }
      } catch (err) {
        console.error("[admin-categories-realtime] Unexpected error refreshing categories:", err);
      }
    }, 150); // 150ms debounce para agrupar eventos consecutivos
  }, []);

  // Determinar si un evento de products afecta el contador de categorías
  const shouldRefreshForProduct = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>): boolean => {
    if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
      return true; // INSERT/DELETE siempre afectan el contador
    }

    if (payload.eventType === "UPDATE") {
      const oldRecord = payload.old as Record<string, unknown> | null;
      const newRecord = payload.new as Record<string, unknown> | null;

      if (!oldRecord || !newRecord) return false;

      // Verificar si cambió category_id o is_available
      const categoryIdChanged = oldRecord.category_id !== newRecord.category_id;
      const availabilityChanged = oldRecord.is_available !== newRecord.is_available;

      return categoryIdChanged || availabilityChanged;
    }

    return false;
  }, []);

  // Determinar si un evento de categories requiere refresh
  const shouldRefreshForCategory = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>): boolean => {
    return payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE";
  }, []);

  // Effect principal: SOLO se ejecuta al montar ([] deps)
  useEffect(() => {
    isMountedRef.current = true;

    const supabase = createBrowserSupabaseClient();

    // Un solo canal para ambas tablas
    const channel: RealtimeChannel = supabase
      .channel("admin-categories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          if (!isMountedRef.current) return;

          if (shouldRefreshForProduct(payload)) {
            scheduleRefresh();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        (payload) => {
          if (!isMountedRef.current) return;

          if (shouldRefreshForCategory(payload)) {
            scheduleRefresh();
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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [scheduleRefresh, shouldRefreshForProduct, shouldRefreshForCategory]);

  return {
    connectionStatus,
  };
}