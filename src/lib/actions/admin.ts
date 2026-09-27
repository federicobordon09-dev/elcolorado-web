"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────────
// Category Zod Schemas & Types
// ──────────────────────────────────────────────────────────────────────────────

const CATEGORY_ID_REGEX = /^[a-z0-9-]+$/;
const MAX_CATEGORY_ID_LEN = 40;
const MAX_CATEGORY_LABEL_LEN = 80;
const MAX_OPTION_ID_LEN = 40;
const MAX_OPTION_LABEL_LEN = 80;
const MAX_OPTION_VALUE_LEN = 60;

// ──────────────────────────────────────────────────────────────────────────────
// Product Zod Schemas & Types
// ──────────────────────────────────────────────────────────────────────────────

const PRODUCT_ID_REGEX = /^[a-z0-9-]+$/;
const MAX_PRODUCT_ID_LEN = 40;
const MAX_PRODUCT_NAME_LEN = 120;
const MAX_PRESENTATION_LEN = 60;
const MAX_PRESENTATIONS_COUNT = 20;

const createProductSchema = z
  .object({
    id: z.string().min(1).max(MAX_PRODUCT_ID_LEN).regex(PRODUCT_ID_REGEX),
    category_id: z.string().min(1).max(MAX_CATEGORY_ID_LEN),
    name: z.string().trim().min(1).max(MAX_PRODUCT_NAME_LEN),
    presentations: z.array(z.string().trim().min(1).max(MAX_PRESENTATION_LEN)).max(MAX_PRESENTATIONS_COUNT).default([]),
    sort_order: z.number().int().min(0).default(0),
    is_available: z.boolean().default(true),
    price_cents: z.number().int().min(0).nullable().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // Check for duplicate presentations
    const presentations = new Set<string>();
    for (const p of val.presentations) {
      if (presentations.has(p)) {
        ctx.addIssue({
          code: "custom",
          path: ["presentations"],
          message: `Presentación duplicada: ${p}`,
        });
      }
      presentations.add(p);
    }
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;

const updateProductSchema = z
  .object({
    id: z.string().min(1).max(MAX_PRODUCT_ID_LEN),
    category_id: z.string().min(1).max(MAX_CATEGORY_ID_LEN).optional(),
    name: z.string().trim().min(1).max(MAX_PRODUCT_NAME_LEN).optional(),
    presentations: z.array(z.string().trim().min(1).max(MAX_PRESENTATION_LEN)).max(MAX_PRESENTATIONS_COUNT).optional(),
    sort_order: z.number().int().min(0).optional(),
    is_available: z.boolean().optional(),
    price_cents: z.number().int().min(0).nullable().optional(),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.presentations) {
      const presentations = new Set<string>();
      for (const p of val.presentations) {
        if (presentations.has(p)) {
          ctx.addIssue({
            code: "custom",
            path: ["presentations"],
            message: `Presentación duplicada: ${p}`,
          });
        }
        presentations.add(p);
      }
    }
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

const archiveProductSchema = z
  .object({
    id: z.string().min(1).max(MAX_PRODUCT_ID_LEN),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict();

export type ArchiveProductInput = z.infer<typeof archiveProductSchema>;

const deleteProductSchema = z
  .object({
    id: z.string().min(1).max(MAX_PRODUCT_ID_LEN),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict();

export type DeleteProductInput = z.infer<typeof deleteProductSchema>;

export type DeleteProductResult = {
  id: string;
};

const categoryOptionSchema = z
  .object({
    id: z.string().min(1).max(MAX_OPTION_ID_LEN),
    label: z.string().trim().min(1).max(MAX_OPTION_LABEL_LEN),
    values: z.array(z.string().trim().min(1).max(MAX_OPTION_VALUE_LEN)).min(1),
  })
  .strict();

const createCategorySchema = z
  .object({
    id: z.string().min(1).max(MAX_CATEGORY_ID_LEN).regex(CATEGORY_ID_REGEX),
    label: z.string().trim().min(1).max(MAX_CATEGORY_LABEL_LEN),
    featured: z.boolean().default(false),
    options: z.array(categoryOptionSchema).default([]),
    sort_order: z.number().int().min(0).default(0),
  })
  .strict()
  .superRefine((val, ctx) => {
    // Check for duplicate option IDs
    const optionIds = new Set<string>();
    for (const opt of val.options) {
      if (optionIds.has(opt.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: `ID de opción duplicado: ${opt.id}`,
        });
      }
      optionIds.add(opt.id);

      // Check for duplicate values within option
      const values = new Set<string>();
      for (const v of opt.values) {
        if (values.has(v)) {
          ctx.addIssue({
            code: "custom",
            path: ["options"],
            message: `Valor duplicado en opción ${opt.id}: ${v}`,
          });
        }
        values.add(v);
      }
    }
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

const updateCategorySchema = z
  .object({
    id: z.string().min(1).max(MAX_CATEGORY_ID_LEN),
    label: z.string().trim().min(1).max(MAX_CATEGORY_LABEL_LEN).optional(),
    featured: z.boolean().optional(),
    options: z.array(categoryOptionSchema).optional(),
    sort_order: z.number().int().min(0).optional(),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.options) {
      const optionIds = new Set<string>();
      for (const opt of val.options) {
        if (optionIds.has(opt.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["options"],
            message: `ID de opción duplicado: ${opt.id}`,
          });
        }
        optionIds.add(opt.id);

        const values = new Set<string>();
        for (const v of opt.values) {
          if (values.has(v)) {
            ctx.addIssue({
              code: "custom",
              path: ["options"],
              message: `Valor duplicado en opción ${opt.id}: ${v}`,
            });
          }
          values.add(v);
        }
      }
    }
  });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

const archiveCategorySchema = z
  .object({
    id: z.string().min(1).max(MAX_CATEGORY_ID_LEN),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict();

export type ArchiveCategoryInput = z.infer<typeof archiveCategorySchema>;

const deleteCategorySchema = z
  .object({
    id: z.string().min(1).max(MAX_CATEGORY_ID_LEN),
    expectedUpdatedAt: z.string().optional(), // optimistic locking
  })
  .strict();

export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export type DeleteCategoryResult = {
  id: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Reorder Categories (F16.4)
const reorderCategoriesSchema = z
  .object({
    categories: z.array(
      z.object({
        id: z.string().min(1).max(MAX_CATEGORY_ID_LEN),
        sort_order: z.number().int().min(0),
      })
    ).min(1),
  })
  .strict();

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export type ReorderCategoriesResult = {
  categories: Array<{ id: string; sort_order: number }>;
};

// ──────────────────────────────────────────────────────────────────────────────
// Admin Product Types
// ──────────────────────────────────────────────────────────────────────────────

export type AdminProductListItem = {
  id: string;
  name: string;
  category_id: string;
  category_label: string;
  is_available: boolean;
  presentations: string[];
  sort_order: number;
  price_cents: number | null;
  updated_at: string;
};

export type CreateProductResult = { id: string; updated_at: string };
export type UpdateProductResult = { id: string; updated_at: string };
export type ArchiveProductResult = { id: string; is_available: boolean; updated_at: string };

// ──────────────────────────────────────────────────────────────────────────────
// Admin Category Types
// ──────────────────────────────────────────────────────────────────────────────

export type AdminCategoryListItem = {
  id: string;
  label: string;
  featured: boolean;
  options: Array<{ id: string; label: string; values: string[] }>;
  sort_order: number;
  products_count: number;
  updated_at: string;
};

export type CreateCategoryResult = { id: string; updated_at: string };
export type UpdateCategoryResult = { id: string; featured: boolean; updated_at: string };
export type ArchiveCategoryResult = { id: string; featured: boolean; updated_at: string };

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
  delivery_address?: string | null;
  delivery_reference?: string | null;
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
  delivery_address: string | null;
  delivery_reference: string | null;
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
  interface SupabaseError extends Error {
  code?: string;
}

try {
    const { supabase } = await requireStaff();

    // Try to fetch with new delivery fields first
    let data: OrderWithItems | null = null;
    let error: SupabaseError | null = null;

    try {
      const result = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          mode,
          customer_name,
          customer_phone,
          table_label,
          delivery_address,
          delivery_reference,
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

      data = result.data;
      error = result.error;
    } catch (e) {
      // If the query fails (e.g., columns don't exist yet), fall back to query without new fields
      error = e as SupabaseError;
    }

    // Fallback: query without new delivery fields if they don't exist yet
    if (error || !data) {
      const fallback = await supabase
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

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("[admin] getOrderDetail error:", error?.message, error?.code);
      if (error?.code === "PGRST116") {
        return { ok: false, code: "NOT_FOUND", message: "Pedido no encontrado" };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo cargar el detalle" };
    }

    // At this point, data is guaranteed to be non-null because we returned early if error
    const d = data!;

    // Map order_items -> items for the AdminOrderDetail type
    // Provide default null values for delivery fields if they don't exist in the data
    const mapped: AdminOrderDetail = {
      id: d.id,
      order_number: d.order_number,
      status: d.status,
      mode: d.mode,
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      table_label: d.table_label,
      delivery_address: (d as unknown as Record<string, string | null | undefined>).delivery_address ?? null,
      delivery_reference: (d as unknown as Record<string, string | null | undefined>).delivery_reference ?? null,
      total_cents: d.total_cents,
      created_at: d.created_at,
      updated_at: d.updated_at,
      items: d.order_items.map((i) => ({
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
// 6. Crear categoría (F14.2)
// ──────────────────────────────────────────────────────────────────────────────

export async function createCategory(
  input: unknown,
): Promise<AdminActionResult<CreateCategoryResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = createCategorySchema.parse(input);
    const { id, label, featured, options, sort_order } = parsed;

    // Build insert object with explicit allowed columns
    const insertData = {
      id,
      label,
      featured,
      options: options.length > 0 ? options : [],
      sort_order,
    };

    const { data: inserted, error } = await supabase
      .from("categories")
      .insert(insertData)
      .select("id, updated_at")
      .single();

    if (error) {
      console.error("[admin] createCategory error:", error.message, error.code);
      if (error.code === "23505") {
        // unique_violation on PK (id)
        return { ok: false, code: "DUPLICATE_ID", message: "Ya existe una categoría con ese ID" };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo crear la categoría" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog may reflect new category
    return { ok: true, data: { id: inserted.id, updated_at: inserted.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] createCategory unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. Actualizar categoría (F14.2)
// ──────────────────────────────────────────────────────────────────────────────

export async function updateCategory(
  input: unknown,
): Promise<AdminActionResult<UpdateCategoryResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = updateCategorySchema.parse(input);
    const { id, expectedUpdatedAt, ...updates } = parsed;

    // Build update object with only provided fields (no id)
    const updateData: Record<string, unknown> = {};
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.featured !== undefined) updateData.featured = updates.featured;
    if (updates.options !== undefined) updateData.options = updates.options.length > 0 ? updates.options : [];
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

    // Atomic update with optimistic locking on updated_at
    let query = supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select("id, featured, updated_at");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] updateCategory error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        // No rows updated - either not found or optimistic lock mismatch
        const { data: current } = await supabase
          .from("categories")
          .select("id, featured, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Categoría no encontrada" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "La categoría fue modificada por otro administrador. Refrescá la lista.",
          };
        }

        // Idempotent: no actual changes needed
        return { ok: true, data: { id: current.id, featured: current.featured, updated_at: current.updated_at } };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar la categoría" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar la categoría" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects category changes
    return { ok: true, data: { id: updated.id, featured: updated.featured, updated_at: updated.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] updateCategory unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. Archivar categoría (F14.2) — Soft-delete via featured=false
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Archive a category by setting featured=false.
 *
 * IMPORTANT: Current getMenuCatalog() behavior:
 * - Categories with ZERO available products are hidden entirely (line 94 in catalog.ts)
 * - featured=true only gives "editorial emphasis" (visual prominence)
 * - featured=false does NOT hide a category if it has available products
 *
 * Therefore, this action only removes visual emphasis. To fully remove a category
 * from the public catalog, all its products must first be set to is_available=false
 * (which is a separate product-level operation).
 *
 * This is a product/design limitation of the current model. No "is_archived" or
 * "deleted_at" field exists on categories. We do NOT implement physical DELETE
 * (FK products.category_id ON DELETE RESTRICT prevents it anyway).
 */
export async function archiveCategory(
  input: unknown,
): Promise<AdminActionResult<ArchiveCategoryResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = archiveCategorySchema.parse(input);
    const { id, expectedUpdatedAt } = parsed;

    // Atomic update with optimistic locking
    let query = supabase
      .from("categories")
      .update({ featured: false })
      .eq("id", id)
      .select("id, featured, updated_at");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] archiveCategory error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        const { data: current } = await supabase
          .from("categories")
          .select("id, featured, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Categoría no encontrada" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "La categoría fue modificada por otro administrador. Refrescá la lista.",
          };
        }

        // Already archived (idempotent)
        if (current.featured === false) {
          return { ok: true, data: { id: current.id, featured: false, updated_at: current.updated_at } };
        }

        return {
          ok: false,
          code: "CONFLICT",
          message: "La categoría fue modificada por otro administrador. Refrescá la lista.",
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo archivar la categoría" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo archivar la categoría" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog may reflect featured change
    return { ok: true, data: { id: updated.id, featured: updated.featured, updated_at: updated.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] archiveCategory unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 8.5. Eliminar categoría físicamente (F16.3)
// ──────────────────────────────────────────────────────────────────────────────

export async function deleteCategory(
  input: unknown,
): Promise<AdminActionResult<DeleteCategoryResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = deleteCategorySchema.parse(input);
    const { id, expectedUpdatedAt } = parsed;

    // Verificar si la categoría tiene productos asociados
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if (productsError) {
      console.error("[admin] deleteCategory products check error:", productsError.message, productsError.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudo verificar productos de la categoría" };
    }

    if (products && products.length > 0) {
      return {
        ok: false,
        code: "HAS_PRODUCTS",
        message: "No se puede eliminar: la categoría tiene productos asociados. Mové o eliminá sus productos antes de eliminarla.",
      };
    }

    // Atomic delete with optimistic locking on updated_at
    let query = supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select("id");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: deleted, error: deleteError } = await query.single();

    if (deleteError) {
      console.error("[admin] deleteCategory error:", deleteError.message, deleteError.code);
      if (deleteError.code === "PGRST116") {
        // No rows deleted - either not found or optimistic lock mismatch
        const { data: current } = await supabase
          .from("categories")
          .select("id, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Categoría no encontrada" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "La categoría fue modificada por otro administrador. Refrescá la lista.",
          };
        }

        // Should not happen since we checked products_count above
        return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar la categoría" };
      }
      if (deleteError.code === "23503") {
        // Foreign key violation - should be caught by our pre-check, but safety net
        return {
          ok: false,
          code: "HAS_PRODUCTS",
          message: "No se puede eliminar: la categoría tiene productos asociados. Mové o eliminá sus productos antes de eliminarla.",
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar la categoría" };
    }

    if (!deleted) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar la categoría" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects category deletion
    return { ok: true, data: { id: deleted.id } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] deleteCategory unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 8.6. Reordenar categorías (F16.4)
// ──────────────────────────────────────────────────────────────────────────────

export async function reorderCategories(
  input: unknown,
): Promise<AdminActionResult<ReorderCategoriesResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = reorderCategoriesSchema.parse(input);
    const { categories: newOrder } = parsed;

    // Validate no duplicate IDs
    const ids = newOrder.map((c) => c.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return { ok: false, code: "INVALID_INPUT", message: "IDs de categorías duplicados en el nuevo orden" };
    }

    // Verify all categories exist
    const idsToCheck = [...uniqueIds];
    const { data: existingCategories, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .in("id", idsToCheck);

    if (fetchError) {
      console.error("[admin] reorderCategories fetch error:", fetchError.message, fetchError.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudieron verificar las categorías" };
    }

    if (!existingCategories || existingCategories.length !== idsToCheck.length) {
      const foundIds = new Set(existingCategories?.map((c) => c.id) ?? []);
      const missingIds = idsToCheck.filter((id) => !foundIds.has(id));
      return { ok: false, code: "NOT_FOUND", message: `Categorías no encontradas: ${missingIds.join(", ")}` };
    }

    // Build updates for each category
    const updates = newOrder.map((c) => ({
      id: c.id,
      sort_order: c.sort_order,
    }));

    // Use a transaction-like approach: update all categories
    // We'll do sequential updates but in a single transaction via supabase.rpc if available,
    // or sequential with error handling
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);

      if (updateError) {
        console.error("[admin] reorderCategories update error:", updateError.message, updateError.code);
        return { ok: false, code: "DB_ERROR", message: "No se pudo reordenar las categorías" };
      }
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects category order

    return {
      ok: true,
      data: { categories: newOrder.map((c) => ({ id: c.id, sort_order: c.sort_order })) },
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] reorderCategories unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. Listar categorías para admin (F14.2)
// ──────────────────────────────────────────────────────────────────────────────

export async function listAdminCategories(): Promise<AdminActionResult<AdminCategoryListItem[]>> {
  try {
    const { supabase } = await requireStaff();

    // Fetch categories with products count via subquery
    const { data, error } = await supabase
      .from("categories")
      .select(`
        id,
        label,
        featured,
        options,
        sort_order,
        updated_at,
        products:products(count)
      `)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .returns<{
        id: string;
        label: string;
        featured: boolean;
        options: unknown;
        sort_order: number;
        updated_at: string;
        products: [{ count: number }] | null;
      }[]>();

    if (error) {
      console.error("[admin] listCategories error:", error.message, error.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudieron cargar las categorías" };
    }

    const categories: AdminCategoryListItem[] = (data ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      featured: c.featured,
      options: Array.isArray(c.options) ? c.options : [],
      sort_order: c.sort_order,
      updated_at: c.updated_at,
      products_count: c.products?.[0]?.count ?? 0,
    }));

    return { ok: true, data: categories };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] listCategories unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 10. Crear producto (F14.4)
// ──────────────────────────────────────────────────────────────────────────────

export async function createProduct(
  input: unknown,
): Promise<AdminActionResult<CreateProductResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = createProductSchema.parse(input);
    const { id, category_id, name, presentations, sort_order, is_available, price_cents } = parsed;

    // Verify category exists
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", category_id)
      .single();

    if (catError || !category) {
      return { ok: false, code: "INVALID_CATEGORY", message: "La categoría seleccionada no existe" };
    }

    // Build insert object with explicit allowed columns
    const insertData = {
      id,
      category_id,
      name,
      presentations: presentations.length > 0 ? presentations : [],
      sort_order,
      is_available,
      price_cents: price_cents ?? null,
    };

    const { data: inserted, error } = await supabase
      .from("products")
      .insert(insertData)
      .select("id, updated_at")
      .single();

    if (error) {
      console.error("[admin] createProduct error:", error.message, error.code);
      if (error.code === "23505") {
        // unique_violation on PK (id)
        return { ok: false, code: "DUPLICATE_ID", message: "Ya existe un producto con ese ID" };
      }
      if (error.code === "23503") {
        // foreign_key_violation on category_id
        return { ok: false, code: "INVALID_CATEGORY", message: "La categoría seleccionada no existe" };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo crear el producto" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog may reflect new product
    return { ok: true, data: { id: inserted.id, updated_at: inserted.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] createProduct unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 11. Actualizar producto (F14.4)
// ──────────────────────────────────────────────────────────────────────────────

export async function updateProduct(
  input: unknown,
): Promise<AdminActionResult<UpdateProductResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = updateProductSchema.parse(input);
    const { id, expectedUpdatedAt, ...updates } = parsed;

    // Verify category exists if provided
    if (updates.category_id !== undefined) {
      const { data: category, error: catError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", updates.category_id)
        .single();

      if (catError || !category) {
        return { ok: false, code: "INVALID_CATEGORY", message: "La categoría seleccionada no existe" };
      }
    }

    // Build update object with only provided fields (no id)
    const updateData: Record<string, unknown> = {};
    if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.presentations !== undefined) updateData.presentations = updates.presentations.length > 0 ? updates.presentations : [];
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
    if (updates.is_available !== undefined) updateData.is_available = updates.is_available;
    if (updates.price_cents !== undefined) updateData.price_cents = updates.price_cents;

    // Atomic update with optimistic locking on updated_at
    let query = supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select("id, updated_at");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] updateProduct error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        // No rows updated - either not found or optimistic lock mismatch
        const { data: current } = await supabase
          .from("products")
          .select("id, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Producto no encontrado" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "El producto fue modificado por otro administrador. Refrescá la lista.",
          };
        }

        // Idempotent: no actual changes needed
        return { ok: true, data: { id: current.id, updated_at: current.updated_at } };
      }
      if (updateError.code === "23503") {
        return { ok: false, code: "INVALID_CATEGORY", message: "La categoría seleccionada no existe" };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar el producto" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo actualizar el producto" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects product changes
    return { ok: true, data: { id: updated.id, updated_at: updated.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] updateProduct unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 12. Archivar/Desactivar producto (F14.4) — Soft-delete via is_available=false
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Archive a product by setting is_available=false.
 *
 * IMPORTANT: Current behavior:
 * - Products with is_available=false are excluded from public catalog (getMenuCatalog)
 * - Physical DELETE is NOT implemented (FK order_items.product_id ON DELETE RESTRICT prevents it)
 * - Historical order_items reference product by id + name snapshot, so deactivation is safe
 * - This is the only way to "remove" a product from the public menu
 */
export async function archiveProduct(
  input: unknown,
): Promise<AdminActionResult<ArchiveProductResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = archiveProductSchema.parse(input);
    const { id, expectedUpdatedAt } = parsed;

    // Atomic update with optimistic locking
    let query = supabase
      .from("products")
      .update({ is_available: false })
      .eq("id", id)
      .select("id, is_available, updated_at");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updated, error: updateError } = await query.single();

    if (updateError) {
      console.error("[admin] archiveProduct error:", updateError.message, updateError.code);
      if (updateError.code === "PGRST116") {
        const { data: current } = await supabase
          .from("products")
          .select("id, is_available, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Producto no encontrado" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "El producto fue modificado por otro administrador. Refrescá la lista.",
          };
        }

        // Already archived (idempotent)
        if (current.is_available === false) {
          return { ok: true, data: { id: current.id, is_available: false, updated_at: current.updated_at } };
        }

        return {
          ok: false,
          code: "CONFLICT",
          message: "El producto fue modificado por otro administrador. Refrescá la lista.",
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo desactivar el producto" };
    }

    if (!updated) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo desactivar el producto" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects is_available change
    return { ok: true, data: { id: updated.id, is_available: updated.is_available, updated_at: updated.updated_at } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] archiveProduct unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 12. Eliminar producto físicamente (F15.7)
// ──────────────────────────────────────────────────────────────────────────────

export async function deleteProduct(
  input: unknown,
): Promise<AdminActionResult<DeleteProductResult>> {
  try {
    const { supabase } = await requireStaff();

    const parsed = deleteProductSchema.parse(input);
    const { id, expectedUpdatedAt } = parsed;

    // Atomic delete with optimistic locking on updated_at
    let query = supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: deleted, error: deleteError } = await query.single();

    if (deleteError) {
      console.error("[admin] deleteProduct error:", deleteError.message, deleteError.code);
      if (deleteError.code === "PGRST116") {
        // No rows deleted - either not found or optimistic lock mismatch
        const { data: current } = await supabase
          .from("products")
          .select("id, updated_at")
          .eq("id", id)
          .single();

        if (!current) {
          return { ok: false, code: "NOT_FOUND", message: "Producto no encontrado" };
        }

        if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
          return {
            ok: false,
            code: "CONFLICT",
            message: "El producto fue modificado por otro administrador. Refrescá la lista.",
          };
        }

        // Product exists but delete returned no rows (shouldn't happen without FK error)
        return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar el producto" };
      }
      if (deleteError.code === "23503") {
        // Foreign key violation - product has order_items referencing it
        return {
          ok: false,
          code: "HAS_ORDERS",
          message: "No se puede eliminar: el producto tiene pedidos asociados. Usá 'No disponible' para conservar el historial.",
        };
      }
      return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar el producto" };
    }

    if (!deleted) {
      return { ok: false, code: "DB_ERROR", message: "No se pudo eliminar el producto" };
    }

    revalidatePath("/admin");
    revalidatePath("/"); // public catalog reflects product deletion (F15.6)
    return { ok: true, data: { id: deleted.id } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, code: "INVALID_INPUT", message: "Parámetros inválidos" };
    }
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] deleteProduct unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 13. Listar productos para admin (F14.4) — Enhanced with category label & price
// ──────────────────────────────────────────────────────────────────────────────

export async function listAdminProducts(): Promise<AdminActionResult<AdminProductListItem[]>> {
  try {
    const { supabase } = await requireStaff();

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        category_id,
        is_available,
        presentations,
        sort_order,
        price_cents,
        updated_at,
        categories!products_category_id_fkey(label)
      `)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .returns<{
        id: string;
        name: string;
        category_id: string;
        is_available: boolean;
        presentations: string[];
        sort_order: number;
        price_cents: number | null;
        updated_at: string;
        categories: { label: string } | null;
      }[]>();

    if (error) {
      console.error("[admin] listProducts error:", error.message, error.code);
      return { ok: false, code: "DB_ERROR", message: "No se pudieron cargar los productos" };
    }

    const products: AdminProductListItem[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category_id: p.category_id,
      category_label: p.categories?.label ?? p.category_id,
      is_available: p.is_available,
      presentations: Array.isArray(p.presentations) ? p.presentations : [],
      sort_order: p.sort_order,
      price_cents: p.price_cents,
      updated_at: p.updated_at,
    }));

    return { ok: true, data: products };
  } catch (e) {
    if (e instanceof Error && (e.message === "UNAUTHENTICATED" || e.message === "UNAUTHORIZED")) {
      return { ok: false, code: e.message, message: "No autorizado" };
    }
    console.error("[admin] listProducts unexpected:", e);
    return { ok: false, code: "INTERNAL", message: "Error interno" };
  }
}