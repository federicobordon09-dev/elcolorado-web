"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Admin Server Actions — P5.2
 * All mutations run on server with SSR client (anon key + session cookies).
 * Authorization verified via is_staff() RPC (SECURITY DEFINER, search_path='').
 * No service-role used for normal admin operations.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type AdminOrderListItem = {
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
};

export type AdminOrderDetail = {
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
};

export type AdminActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; currentStatus?: string; currentAvailable?: boolean; order_number?: number; product_id?: string };

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function requireStaff(): Promise<{
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  claims: { sub: string; email?: string; [key: string]: unknown } | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data: isStaff, error: isStaffError } = await supabase.rpc("is_staff");
  if (isStaffError || !isStaff) {
    throw new Error("UNAUTHORIZED");
  }

  return { supabase, claims: data.claims };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Listar pedidos (admin)
// ──────────────────────────────────────────────────────────────────────────────

export async function listAdminOrders(): Promise<AdminActionResult<AdminOrderListItem[]>> {
  try {
    const { supabase } = await requireStaff();

    // Fetch orders with items count via subquery
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        mode,
        customer_name,
        table_label,
        total_cents,
        created_at,
        updated_at,
        order_items:order_items(count)
      `)
      .order("created_at", { ascending: false })
      .returns<{
        id: string;
        order_number: number;
        status: AdminOrderListItem["status"];
        mode: AdminOrderListItem["mode"];
        customer_name: string;
        table_label: string | null;
        total_cents: number | null;
        created_at: string;
        updated_at: string;
        order_items: [{ count: number }] | null;
      }[]>();

    if (error) {
      console.error("[admin] listOrders error:", error.message, error.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudieron cargar los pedidos" };
    }

    const orders: AdminOrderListItem[] = (data ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      mode: o.mode,
      customer_name: o.customer_name,
      table_label: o.table_label,
      total_cents: o.total_cents,
      created_at: o.created_at,
      updated_at: o.updated_at,
      items_count: o.order_items?.[0]?.count ?? 0,
    }));

    return { ok: true, data: orders };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] listOrders unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Detalle de pedido
// ──────────────────────────────────────────────────────────────────────────────

type OrderWithItems = {
  id: string;
  order_number: number;
  status: AdminOrderDetail["status"];
  mode: AdminOrderDetail["mode"];
  customer_name: string;
  customer_phone: string | null;
  table_label: string | null;
  total_cents: number | null;
  created_at: string;
  updated_at: string;
  order_items: {
    id: string;
    product_name_snapshot: string;
    presentation: string | null;
    selected_option: string | null;
    quantity: number;
    unit_price_cents: number | null;
    note: string | null;
    created_at: string;
  }[];
};

export async function getAdminOrderDetail(orderId: string): Promise<AdminActionResult<AdminOrderDetail>> {
  try {
    const { supabase } = await requireStaff();

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        mode,
        customer_name,
        customer_phone,
        table_label,
        total_cents,
        created_at,
        updated_at,
        order_items (
          id,
          product_name_snapshot,
          presentation,
          selected_option,
          quantity,
          unit_price_cents,
          note,
          created_at
        )
      `)
      .eq("id", orderId)
      .single()
      .returns<OrderWithItems>();

    if (error) {
      console.error("[admin] getOrderDetail error:", error.message, error.code);
      if (error.code === "PGRST116") {
        return { ok: false, code: "NOT_FOUND", message: "Pedido no encontrado" };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo cargar el detalle" };
    }

    // Map order_items -> items for the AdminOrderDetail type
    const mapped: AdminOrderDetail = {
      id: data.id,
      order_number: data.order_number,
      status: data.status,
      mode: data.mode,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      table_label: data.table_label,
      total_cents: data.total_cents,
      created_at: data.created_at,
      updated_at: data.updated_at,
      items: data.order_items.map((i) => ({
        id: i.id,
        product_name_snapshot: i.product_name_snapshot,
        presentation: i.presentation,
        selected_option: i.selected_option,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
        note: i.note,
        created_at: i.created_at,
      })),
    };

    return { ok: true, data: mapped };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] getOrderDetail unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Cambiar estado de pedido (pending → preparing → ready)
// ──────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["preparing"],
  preparing: ["ready"],
  // ready no tiene transición hacia adelante en P5.2 (delivered/cancelled son out of scope)
};

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(["pending", "preparing", "ready"]),
  expectedStatus: z.enum(["pending", "preparing", "ready"]).optional(),
});

export async function updateOrderStatus(
  input: unknown,
): Promise<AdminActionResult<{ order_number: number; status: "pending" | "preparing" | "ready"; updated_at: string }>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = updateOrderStatusSchema.parse(input);
    const { orderId, newStatus, expectedStatus } = parsed;

    // Validate transition first (client-side check for better UX)
    const allowed = VALID_TRANSITIONS[expectedStatus ?? ""];
    if (expectedStatus && (!allowed || !allowed.includes(newStatus))) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Transición no permitida: ${expectedStatus} → ${newStatus}`,
      };
    }

    // Atomic update with optimistic locking:
    // - Only update if current status matches expectedStatus (if provided)
    // - Only allow valid transitions (DB-level check via CHECK constraint would be ideal but we enforce here)
    // - Return updated_at for optimistic locking on client
    let query = supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .select("order_number, status, updated_at");

    // If expectedStatus provided, add it as a condition for optimistic locking
    if (expectedStatus) {
      query = query.eq("status", expectedStatus);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] updateOrderStatus update error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        // No rows updated - either order not found or status didn't match expectedStatus
        // Fetch current state to give a precise error
        const { data: current } = await supabase
          .from("orders")
          .select("status, order_number")
          .eq("id", orderId)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Pedido no encontrado" };
        }

        if (expectedStatus && current.status !== expectedStatus) {
          return {
            ok: false,
            code: "CONFLICT",
            message: `El pedido ya cambió de estado (actual: ${current.status}). Refrescá la lista.`,
            // Include current state so client can recover
            currentStatus: current.status,
            order_number: current.order_number,
          };
        }

        // Valid transition check against actual current status
        const allowedActual = VALID_TRANSITIONS[current.status];
        if (!allowedActual || !allowedActual.includes(newStatus)) {
          return {
            ok: false,
            code: "INVALID_TRANSITION",
            message: `Transición no permitida: ${current.status} → ${newStatus}`,
          };
        }

        // Race condition: another admin updated it to a valid next state
        return {
          ok: false,
          code: "CONFLICT",
          message: `El pedido fue actualizado por otro administrador (actual: ${current.status}). Refrescá la lista.`,
          currentStatus: current.status,
          order_number: current.order_number,
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar el estado" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar el estado" };
    }

    revalidatePath("/admin");
    return {
      ok: true,
      data: {
        order_number: updated.order_number,
        status: updated.status as "pending" | "preparing" | "ready",
        updated_at: updated.updated_at,
      },
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] updateOrderStatus unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Toggle is_available de productos
// ──────────────────────────────────────────────────────────────────────────────

const toggleProductAvailabilitySchema = z.object({
  productId: z.string().min(1).max(40),
  isAvailable: z.boolean(),
  expectedAvailable: z.boolean().optional(),
});

export async function toggleProductAvailability(
  input: unknown,
): Promise<AdminActionResult<{ product_id: string; is_available: boolean; updated_at: string }>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = toggleProductAvailabilitySchema.parse(input);
    const { productId, isAvailable, expectedAvailable } = parsed;

    // Atomic update with optimistic locking
    let query = supabase
      .from("products")
      .update({ is_available: isAvailable })
      .eq("id", productId)
      .select("id, is_available, updated_at");

    // If expectedAvailable provided, add it as a condition for optimistic locking
    if (expectedAvailable !== undefined) {
      query = query.eq("is_available", expectedAvailable);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] toggleAvailability update error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        // No rows updated - either product not found or is_available didn't match expected
        const { data: current } = await supabase
          .from("products")
          .select("is_available, id")
          .eq("id", productId)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Producto no encontrado" };
        }

        if (expectedAvailable !== undefined && current.is_available !== expectedAvailable) {
          return {
            ok: false,
            code: "CONFLICT",
            message: `El producto ya cambió de disponibilidad (actual: ${current.is_available ? "disponible" : "no disponible"}). Refrescá la lista.`,
            currentAvailable: current.is_available,
            product_id: current.id,
          };
        }

        // Idempotent: already in desired state
        if (current.is_available === isAvailable) {
          return { ok: true, data: { product_id: current.id, is_available: current.is_available, updated_at: new Date().toISOString() } };
        }

        return {
          ok: false,
          code: "CONFLICT",
          message: `El producto fue actualizado por otro administrador (actual: ${current.is_available ? "disponible" : "no disponible"}). Refrescá la lista.`,
          currentAvailable: current.is_available,
          product_id: current.id,
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar disponibilidad" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar disponibilidad" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects is_available
    return {
      ok: true,
      data: {
        product_id: updated.id,
        is_available: updated.is_available,
        updated_at: updated.updated_at,
      },
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] toggleAvailability unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Listar productos para admin (con is_available)
// ──────────────────────────────────────────────────────────────────────────────

export type AdminProductListItem = {
  id: string;
  name: string;
  category_id: string;
  is_available: boolean;
  presentations: string[];
  sort_order: number;
  updated_at: string;
};

export async function listAdminProducts(): Promise<AdminActionResult<AdminProductListItem[]>> {
  try {
    const { supabase } = await requireStaff();

    const { data, error } = await supabase
      .from("products")
      .select("id, name, category_id, is_available, presentations, sort_order, updated_at")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .returns<AdminProductListItem[]>();

    if (error) {
      console.error("[admin] listProducts error:", error.message, error.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudieron cargar los productos" };
    }

    return { ok: true, data: data ?? [] };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] listProducts unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}