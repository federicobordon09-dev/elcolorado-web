"use client";

import { useCatalogRealtime } from "./useCatalogRealtime";

/**
 * Componente wrapper que monta la suscripción Realtime del catálogo público.
 * Debe renderizarse dentro de un layout que tenga acceso a `useRouter` (p.ej. page.tsx).
 * No renderiza nada visible.
 */
export function CatalogRealtimeSync() {
  useCatalogRealtime();
  return null;
}