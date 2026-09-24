"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  fromCatalogIndexDTO,
  type CatalogIndex,
  type CatalogIndexDTO,
} from "@/lib/catalog-index";

const CatalogContext = createContext<CatalogIndex | null>(null);

/**
 * Provides the live catalog index (built on the server from Supabase) to
 * client cart UI. Availability checks and product display names read from
 * here — never from localStorage alone.
 */
export function CatalogProvider({
  dto,
  children,
}: {
  dto: CatalogIndexDTO;
  children: ReactNode;
}) {
  const index = fromCatalogIndexDTO(dto);
  return (
    <CatalogContext.Provider value={index}>{children}</CatalogContext.Provider>
  );
}

export function useCatalogIndex(): CatalogIndex {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalogIndex must be used within <CatalogProvider>");
  }
  return ctx;
}
