"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook para suscripción Realtime a cambios en el catálogo público.
 * - Escucha INSERT/UPDATE/DELETE en `categories` y `products`.
 * - Al recibir cualquier evento, dispara `router.refresh()` para obtener
 *   el catálogo actualizado vía SSR (reusa getMenuCatalog + force-dynamic).
 * - Diseñado para montarse una sola vez en el layout raíz de la carta pública.
 *
 * Requisitos previos (ver migración 20260927000001_catalog_realtime_sync.sql):
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.categories, public.products;
 *
 * Seguridad:
 *   - Solo usa la anon/publishable key (createBrowserSupabaseClient).
 *   - RLS permite SELECT a `anon` en ambas tablas (políticas catalog_*_read).
 *   - No expone datos que no sean legibles públicamente.
 */
export function useCatalogRealtime(): void {
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  // Debounce: evitar múltiples refresh si llegan varios eventos seguidos
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (!isMountedRef.current) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        // router.refresh() pide al servidor el HTML actualizado (SSR con getMenuCatalog fresco)
        // y hace partial hydration: actualiza solo los componentes que cambiaron.
        router.refresh();
      }
    }, 150); // 150ms debounce para coalescar múltiples eventos
  }, [router]);

  useEffect(() => {
    isMountedRef.current = true;

    const supabase = createBrowserSupabaseClient();

    // Un solo canal para ambas tablas
    const channel: RealtimeChannel = supabase
      .channel("public-catalog-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        (payload) => {
          // Solo reaccionar a cambios reales (no escucha solo de esquema)
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            scheduleRefresh();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            scheduleRefresh();
          }
        }
      )
      .subscribe((status) => {
        if (!isMountedRef.current) return;

        // Opcional: logging para debug
        if (process.env.NODE_ENV === "development") {
          console.log("[catalog-realtime] status:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [scheduleRefresh]);
}