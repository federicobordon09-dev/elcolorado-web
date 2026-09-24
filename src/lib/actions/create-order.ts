"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkoutInputSchema, CheckoutValidationError, type CheckoutInput } from "@/lib/orders/checkout-schema";

export type CreateOrderSuccess = {
  ok: true;
  orderNumber: number;
  publicToken: string;
};

export type CreateOrderFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

type RpcLine = {
  productId: string;
  presentation: string | null;
  selectedOption: string | null;
  quantity: number;
  note: string | null;
};

type RpcCreateOrderArgs = {
  p_customer_name: string;
  p_customer_phone: string | null;
  p_mode: "dine_in" | "takeaway";
  p_table_label: string | null;
  p_lines: RpcLine[];
};

type RpcCreateOrderReturn = {
  order_number: number;
  public_token: string;
};

function toRpcLines(input: CheckoutInput): RpcLine[] {
  return input.lines.map((l) => ({
    productId: l.productId,
    presentation: l.presentation ?? null,
    selectedOption: l.selectedOption ?? null,
    quantity: l.quantity,
    note: l.note === "" ? null : l.note,
  }));
}

export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  let parsed: CheckoutInput;
  try {
    parsed = checkoutInputSchema.parse(input);
  } catch (e) {
    if (e instanceof CheckoutValidationError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "INVALID_INPUT", message: "Invalid checkout input" };
  }

  const supabase = await createServerSupabaseClient();

  const rpcArgs: RpcCreateOrderArgs = {
    p_customer_name: parsed.customerName,
    p_customer_phone: parsed.customerPhone ?? null,
    p_mode: parsed.mode,
    p_table_label: parsed.tableLabel ?? null,
    p_lines: toRpcLines(parsed),
  };

  try {
    const { data, error } = await supabase.rpc("create_order", rpcArgs as unknown as Record<string, unknown>);

    if (error) {
      const code = error.code ?? "INTERNAL";
      const msg = error.message ?? "Failed to create order";
      return { ok: false, code, message: msg };
    }

    const rows = data as RpcCreateOrderReturn[] | null;
    const res = rows?.[0] ?? null;
    if (!res || typeof res.order_number !== "number" || typeof res.public_token !== "string") {
      return { ok: false, code: "INTERNAL", message: "Unexpected RPC response" };
    }

    revalidatePath("/");
    return {
      ok: true,
      orderNumber: res.order_number,
      publicToken: res.public_token,
    };
  } catch (e) {
    if (e instanceof CheckoutValidationError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return { ok: false, code: "INTERNAL", message: "Failed to create order" };
  }
}