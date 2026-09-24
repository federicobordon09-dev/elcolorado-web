/**
 * P7.2 Adversarial Security & Concurrency Tests
 * 
 * Tests for El Colorado Admin API:
 * - Concurrency (race conditions) on updateOrderStatus & toggleProductAvailability
 * - Authorization (unauthenticated, non-staff)
 * - State transition integrity
 * - Client input manipulation
 * - Error message safety (no info leakage)
 * 
 * Run: node --experimental-strip-types scripts/adversarial-admin.check.mjs
 * Requires .env.local with Supabase credentials + staff user authenticated
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dir, "../.env.local");
const envRaw = readFileSync(envPath, "utf8");

function env(name) {
  const line = envRaw.split(/\r?\n/).find((l) => l.startsWith(name + "="));
  if (!line) throw new Error(`Missing ${name} in .env.local`);
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, serviceKey); // for cleanup only
let pass = 0;
let fail = 0;
const createdOrders = [];
const createdProducts = [];

function ok(name) { pass++; console.log("✅ PASS", name); }
function bad(name, e) { fail++; console.error("❌ FAIL", name, e?.message ?? e); }

async function rpc(fnName, payload) {
  const { data, error } = await anon.rpc(fnName, payload);
  return { ok: !error, data, error };
}

async function callAction(actionName, payload, client = anon) {
  // Simulate Server Action call via RPC - we need to call the actual Server Action
  // Since we can't call Server Actions directly from Node, we test via the underlying DB operations
  // that the Server Actions perform, using the same auth context
  throw new Error("Use direct DB operations for testing");
}

function cleanupOrder(orderNumber) {
  createdOrders.push(orderNumber);
}

async function cleanupAll() {
  console.log("\n🧹 Cleaning up test data...");
  for (const orderNum of createdOrders) {
    try {
      await admin.from("orders").delete().eq("order_number", orderNum);
    } catch (e) {
      console.error("  cleanup warn:", e.message);
    }
  }
  createdOrders.length = 0;
}

// ============================================================================
// TEST SETUP: Create two anon clients (simulating two different sessions)
// Both will use the same anon key but we can test concurrent DB operations
// ============================================================================
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const anon2 = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

// For testing admin actions, we need a staff-authenticated context
// Since we can't easily create two staff sessions from Node, we test the DB-level
// optimistic locking directly using the service role (which bypasses RLS but we
// add the same WHERE conditions the Server Actions use).

// ============================================================================
// HELPERS: Direct DB operations that mirror Server Action logic
// ============================================================================

async function createTestOrder(status = "pending") {
  const { data, error } = await admin
    .from("orders")
    .insert({
      customer_name: "TEST_ADVERSARIAL",
      mode: "takeaway",
      status,
      customer_phone: null,
      table_label: null,
    })
    .select("id, order_number, status, updated_at")
    .single();
  if (error) throw error;
  createdOrders.push(data.order_number);
  return data;
}

async function getOrderStatus(orderId) {
  const { data, error } = await admin
    .from("orders")
    .select("id, order_number, status, updated_at")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

async function atomicUpdateOrderStatus(orderId, newStatus, expectedStatus) {
  // Mirrors Server Action: UPDATE orders SET status=$1 WHERE id=$2 AND status=$3
  let query = admin
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select("order_number, status, updated_at");

  if (expectedStatus) {
    query = query.eq("status", expectedStatus);
  }

  const { data, error } = await query.single();
  return { data, error };
}

async function atomicToggleProduct(productId, isAvailable, expectedAvailable) {
  let query = admin
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", productId)
    .select("id, is_available, updated_at");

  if (expectedAvailable !== undefined) {
    query = query.eq("is_available", expectedAvailable);
  }

  const { data, error } = await query.single();
  return { data, error };
}

async function callAdminAction(actionName, payload, supabaseClient = admin) {
  // For testing authorization, we simulate what requireStaff() does
  // by using different clients
  throw new Error("Not implemented - use direct DB ops");
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function runConcurrencyTests() {
  console.log("\n🔬 CONCURRENCY TESTS");
  console.log("────────────────────");

  // Test 1: Two concurrent updates to same order with same expectedStatus
  console.log("\n1. Concurrent updateOrderStatus (same expectedStatus) — only one should succeed");
  {
    const order = await createTestOrder("pending");
    const orderId = order.id;

    // Fire two concurrent updates with same expectedStatus
    const [r1, r2] = await Promise.all([
      atomicUpdateOrderStatus(orderId, "preparing", "pending"),
      atomicUpdateOrderStatus(orderId, "preparing", "pending"),
    ]);

    const successCount = [r1, r2].filter(r => r.data).length;
    const conflictCount = [r1, r2].filter(r => r.error?.code === "PGRST116").length;

    if (successCount === 1 && conflictCount === 1) {
      ok("Concurrency: exactly one succeeded, one conflicted");
    } else {
      bad("Concurrency: expected 1 success + 1 conflict", { r1, r2 });
    }

    // Verify final state
    const final = await getOrderStatus(orderId);
    if (final.status === "preparing") {
      ok("Final state consistent: preparing");
    } else {
      bad("Final state inconsistent", final);
    }
  }

  // Test 2: Concurrent toggleProductAvailability with same expectedAvailable
  console.log("\n2. Concurrent toggleProductAvailability (same expectedAvailable) — only one should succeed");
  {
    // Use a product that exists
    const productId = "pizza-mozarella";
    
    // Ensure it's available first
    await admin.from("products").update({ is_available: true }).eq("id", productId);
    
    const [r1, r2] = await Promise.all([
      atomicToggleProduct(productId, false, true),
      atomicToggleProduct(productId, false, true),
    ]);

    const successCount = [r1, r2].filter(r => r.data).length;
    const conflictCount = [r1, r2].filter(r => r.error?.code === "PGRST116").length;

    if (successCount === 1 && conflictCount === 1) {
      ok("Concurrency: exactly one toggle succeeded, one conflicted");
    } else {
      bad("Concurrency toggle: expected 1 success + 1 conflict", { r1, r2 });
    }

    // Verify final state
    const { data: product } = await admin.from("products").select("is_available").eq("id", productId).single();
    if (product.is_available === false) {
      ok("Final toggle state consistent: unavailable");
    } else {
      bad("Final toggle state inconsistent", product);
    }
    // Restore
    await admin.from("products").update({ is_available: true }).eq("id", productId);
  }

  // Test 3: Second request with stale expectedStatus should conflict
  console.log("\n3. Stale expectedStatus — second request conflicts with current state");
  {
    const order = await createTestOrder("pending");
    const orderId = order.id;

    // First succeeds
    const r1 = await atomicUpdateOrderStatus(orderId, "preparing", "pending");
    if (!r1.data) return bad("First update failed", r1.error);

    // Second with stale expectedStatus=pending should fail with CONFLICT
    const r2 = await atomicUpdateOrderStatus(orderId, "ready", "pending");
    if (r2.error?.code === "PGRST116") {
      ok("Stale expectedStatus correctly rejected (PGRST116)");
    } else {
      bad("Stale expectedStatus should have been rejected", r2);
    }

    // Verify state is still preparing (not ready)
    const final = await getOrderStatus(orderId);
    if (final.status === "preparing") {
      ok("State unchanged after stale expectedStatus conflict");
    } else {
      bad("State changed unexpectedly", final);
    }
  }
}

async function runAuthorizationTests() {
  console.log("\n🔐 AUTHORIZATION TESTS");
  console.log("────────────────────────");

  // We test authorization by using the service role to verify RLS policies
  // The Server Actions check requireStaff() which calls getClaims() + is_staff()
  // Here we test the underlying RLS policies directly

  console.log("\n1. Unauthenticated anon cannot read orders");
  {
    const { error } = await anon.from("orders").select("id").limit(1);
    if (error) {
      ok("Anon blocked from reading orders (RLS)");
    } else {
      bad("Anon should not read orders", "unexpectedly allowed");
    }
  }

  console.log("\n2. Anon cannot read order_items");
  {
    const { error } = await anon.from("order_items").select("id").limit(1);
    if (error) {
      ok("Anon blocked from reading order_items (RLS)");
    } else {
      bad("Anon should not read order_items", "unexpectedly allowed");
    }
  }

  console.log("\n3. Anon cannot update orders");
  {
    const { data: orders } = await admin.from("orders").select("id").limit(1);
    if (orders?.length) {
      const { error } = await anon.from("orders").update({ status: "preparing" }).eq("id", orders[0].id);
      if (error) {
        ok("Anon blocked from updating orders (RLS)");
      } else {
        bad("Anon should not update orders", "unexpectedly allowed");
      }
    }
  }

  console.log("\n4. Anon cannot update products availability");
  {
    const { data: products } = await admin.from("products").select("id").limit(1);
    if (products?.length) {
      const { error } = await anon.from("products").update({ is_available: false }).eq("id", products[0].id);
      if (error) {
        ok("Anon blocked from updating products (RLS)");
      } else {
        bad("Anon should not update products", "unexpectedly allowed");
      }
    }
  }

  console.log("\n5. Anon cannot list admin orders (via RPC pattern)");
  // The Server Actions check is_staff() which anon cannot execute
  {
    const { error } = await anon.rpc("is_staff");
    if (error) {
      ok("Anon cannot execute is_staff() RPC");
    } else {
      bad("Anon should not execute is_staff()", "unexpectedly allowed");
    }
  }
}

async function runTransitionIntegrityTests() {
  console.log("\n🔄 STATE TRANSITION INTEGRITY TESTS");
  console.log("─────────────────────────────────────");

  const validTransitions = [
    { from: "pending", to: "preparing", shouldPass: true },
    { from: "preparing", to: "ready", shouldPass: true },
  ];

  const invalidTransitions = [
    { from: "pending", to: "ready", desc: "skip preparing" },
    { from: "preparing", to: "pending", desc: "backward" },
    { from: "ready", to: "preparing", desc: "backward from ready" },
    { from: "ready", to: "pending", desc: "backward from ready" },
    { from: "delivered", to: "ready", desc: "from terminal" },
    { from: "cancelled", to: "pending", desc: "from terminal" },
  ];

  console.log("\n1. Valid transitions allowed");
  for (const t of validTransitions) {
    const order = await createTestOrder(t.from);
    const r = await atomicUpdateOrderStatus(order.id, t.to, t.from);
    if (r.data?.status === t.to) {
      ok(`Valid transition: ${t.from} → ${t.to}`);
    } else {
      bad(`Valid transition ${t.from} → ${t.to} rejected`, r.error);
    }
  }

  console.log("\n2. Invalid transitions rejected");
  for (const t of invalidTransitions) {
    const order = await createTestOrder(t.from);
    const r = await atomicUpdateOrderStatus(order.id, t.to, t.from);
    if (r.error || (r.data && r.data.status !== t.to)) {
      ok(`Invalid transition rejected: ${t.from} → ${t.to} (${t.desc})`);
    } else {
      bad(`Invalid transition ${t.from} → ${t.to} unexpectedly allowed`, r.data);
    }
  }

  console.log("\n3. Transition with wrong expectedStatus rejected");
  {
    const order = await createTestOrder("pending");
    // Try to go pending -> preparing but claim it's already preparing
    const r = await atomicUpdateOrderStatus(order.id, "preparing", "preparing");
    if (r.error?.code === "PGRST116") {
      ok("Wrong expectedStatus (preparing when pending) rejected");
    } else {
      bad("Wrong expectedStatus should be rejected", r);
    }
  }

  console.log("\n4. Transition from non-existent order rejected");
  {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const r = await atomicUpdateOrderStatus(fakeId, "preparing", "pending");
    if (r.error?.code === "PGRST116") {
      ok("Non-existent order rejected");
    } else {
      bad("Non-existent order should be rejected", r);
    }
  }
}

async function runClientManipulationTests() {
  console.log("\n🛡️ CLIENT MANIPULATION TESTS");
  console.log("──────────────────────────────");

  // Test that client cannot manipulate protected fields via the Server Actions
  // Since Server Actions validate with Zod and DB enforces constraints,
  // we test the underlying DB constraints directly

  console.log("\n1. Client cannot set arbitrary order_id");
  {
    // The UUID is generated by DB, client only sends it for updates
    // Try to update with fake UUID
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const r = await atomicUpdateOrderStatus(fakeId, "preparing", "pending");
    if (r.error?.code === "PGRST116") {
      ok("Fake order_id rejected");
    } else {
      bad("Fake order_id should be rejected", r);
    }
  }

  console.log("\n2. Client cannot manipulate expectedStatus to skip states");
  {
    const order = await createTestOrder("pending");
    // Try to claim it's preparing to jump to ready
    const r = await atomicUpdateOrderStatus(order.id, "ready", "preparing");
    if (r.error?.code === "PGRST116") {
      ok("Manipulated expectedStatus to skip state rejected");
    } else {
      bad("Manipulated expectedStatus should be rejected", r);
    }
  }

  console.log("\n3. Client cannot set invalid status values");
  {
    const order = await createTestOrder("pending");
    // Try to inject invalid status via direct DB (bypassing Zod)
    const { error } = await admin
      .from("orders")
      .update({ status: "hacked_status" })
      .eq("id", order.id);
    if (error) {
      ok("Invalid status enum rejected by DB constraint");
    } else {
      bad("Invalid status should be rejected by enum constraint", "unexpectedly allowed");
    }
    // Restore
    await admin.from("orders").update({ status: "pending" }).eq("id", order.id);
  }

  console.log("\n4. Client cannot manipulate product availability expectedAvailable");
  {
    const productId = "pizza-mozarella";
    // Ensure available
    await admin.from("products").update({ is_available: true }).eq("id", productId);
    
    // Try to claim it's unavailable to flip to available (no-op but tests logic)
    const r = await atomicToggleProduct(productId, true, false);
    if (r.error?.code === "PGRST116") {
      ok("Manipulated expectedAvailable rejected");
    } else {
      bad("Manipulated expectedAvailable should be rejected", r);
    }
  }

  console.log("\n5. Product ID manipulation rejected");
  {
    const r = await atomicToggleProduct("non-existent-product", true, false);
    if (r.error?.code === "PGRST116") {
      ok("Non-existent product ID rejected");
    } else {
      bad("Non-existent product ID should be rejected", r);
    }
  }
}

async function runCreateOrderSecurityTests() {
  console.log("\n📦 CREATE_ORDER SECURITY TESTS (adversarial)");
  console.log("─────────────────────────────────────────────");

  // The RPC function signature is fixed - extra parameters are ignored by Postgres
  // We verify security by attempting to pass malicious parameters and confirming
  // they have no effect (rejected or ignored)

  console.log("\n1. Client cannot inject price/total via extra parameters");
  {
    const { error, data } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 1, note: "" }],
      // Attempt to inject price/total - these params don't exist in function signature
      p_price_cents: 999999,
      p_total_cents: 999999,
    });
    // Should succeed (extra params ignored) but price remains NULL in DB
    // or fail if RPC strict mode enabled. Either way, verify no price injected.
    const { data: orders } = await admin
      .from("orders")
      .select("total_cents")
      .eq("customer_name", "TEST")
      .order("created_at", { ascending: false })
      .limit(1);
    if (orders?.length && (orders[0].total_cents === null || orders[0].total_cents === 0)) {
      ok("Price/total injection ignored (total_cents stays NULL)");
      // Cleanup
      if (data) await admin.from("orders").delete().eq("order_number", data[0]?.order_number);
    } else if (error) {
      ok("Price/total injection rejected by RPC");
    } else {
      bad("Price/total might have been injected", { data, error });
    }
  }

  console.log("\n2. Client cannot inject order_number");
  {
    const { error, data } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 1, note: "" }],
      p_order_number: 999999,
    });
    // order_number is generated by identity column, cannot be injected
    if (!error) {
      const { data: orders } = await admin
        .from("orders")
        .select("order_number")
        .eq("customer_name", "TEST")
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders?.length && orders[0].order_number !== 999999) {
        ok("order_number injection ignored (DB generates identity)");
        if (data) await admin.from("orders").delete().eq("order_number", data[0]?.order_number);
      } else {
        bad("order_number might have been injected", orders);
      }
    } else {
      ok("order_number injection rejected by RPC");
    }
  }

  console.log("\n3. Client cannot inject public_token");
  {
    const { error, data } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 1, note: "" }],
      p_public_token: "00000000-0000-0000-0000-000000000000",
    });
    // public_token is generated by DB default
    if (!error) {
      const { data: orders } = await admin
        .from("orders")
        .select("public_token")
        .eq("customer_name", "TEST")
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders?.length && orders[0].public_token !== "00000000-0000-0000-0000-000000000000") {
        ok("public_token injection ignored (DB generates UUID)");
        if (data) await admin.from("orders").delete().eq("order_number", data[0]?.order_number);
      } else {
        bad("public_token might have been injected", orders);
      }
    } else {
      ok("public_token injection rejected by RPC");
    }
  }

  console.log("\n4. Client cannot set status");
  {
    const { error, data } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 1, note: "" }],
      p_status: "ready",
    });
    // status defaults to 'pending', cannot be set by client
    if (!error) {
      const { data: orders } = await admin
        .from("orders")
        .select("status")
        .eq("customer_name", "TEST")
        .order("created_at", { ascending: false })
        .limit(1);
      if (orders?.length && orders[0].status === "pending") {
        ok("Status injection ignored (defaults to pending)");
        if (data) await admin.from("orders").delete().eq("order_number", data[0]?.order_number);
      } else {
        bad("Status might have been injected", orders);
      }
    } else {
      ok("Status injection rejected by RPC");
    }
  }

  console.log("\n5. Nonexistent product rejected");
  {
    const { error } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "no-such-product", presentation: null, selectedOption: null, quantity: 1, note: "" }],
    });
    if (error && (error.code === "P0001" || error.message?.includes("not found"))) {
      ok("Nonexistent product rejected by RPC");
    } else {
      bad("Nonexistent product should be rejected", error);
    }
  }

  console.log("\n6. Unavailable product rejected");
  {
    // Make a product unavailable
    await admin.from("products").update({ is_available: false }).eq("id", "pizza-mozarella");
    
    const { error } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 1, note: "" }],
    });
    
    // Restore
    await admin.from("products").update({ is_available: true }).eq("id", "pizza-mozarella");
    
    if (error && (error.code === "P0001" || error.message?.includes("unavailable"))) {
      ok("Unavailable product rejected by RPC");
    } else {
      bad("Unavailable product should be rejected", error);
    }
  }

  console.log("\n7. Quantity out of bounds rejected");
  {
    const { error } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 21, note: "" }],
    });
    if (error && (error.code === "P0001" || error.message?.includes("quantity"))) {
      ok("Quantity > 20 rejected");
    } else {
      bad("Quantity > 20 should be rejected", error);
    }
  }

  console.log("\n8. Quantity < 1 rejected");
  {
    const { error } = await anon.rpc("create_order", {
      p_customer_name: "TEST",
      p_customer_phone: null,
      p_mode: "takeaway",
      p_table_label: null,
      p_lines: [{ productId: "pizza-mozarella", presentation: null, selectedOption: null, quantity: 0, note: "" }],
    });
    if (error && (error.code === "P0001" || error.message?.includes("quantity"))) {
      ok("Quantity < 1 rejected");
    } else {
      bad("Quantity < 1 should be rejected", error);
    }
  }
}

async function runErrorMessageSafetyTests() {
  console.log("\n🔒 ERROR MESSAGE SAFETY TESTS");
  console.log("────────────────────────────────");

  // Test that error messages don't leak sensitive info

  console.log("\n1. Conflict error doesn't leak SQL");
  {
    const order = await createTestOrder("pending");
    const orderId = order.id;
    
    // First succeeds
    await atomicUpdateOrderStatus(orderId, "preparing", "pending");
    // Second conflicts
    const r = await atomicUpdateOrderStatus(orderId, "ready", "pending");
    
    if (r.error?.message && !r.error.message.includes("SQL") && !r.error.message.includes("query") && !r.error.message.includes("column")) {
      ok("Conflict error message safe (no SQL leakage)");
    } else {
      bad("Conflict error might leak SQL details", r.error);
    }
  }

  console.log("\n2. Auth errors don't leak user details");
  {
    // Test with unauthenticated client
    const { error } = await anon.from("orders").select("id").limit(1);
    if (error && !error.message.includes("password") && !error.message.includes("secret") && !error.message.includes("key")) {
      ok("RLS error safe (no credential leakage)");
    } else {
      bad("RLS error might leak sensitive info", error);
    }
  }

  console.log("\n3. Not found errors don't leak internal IDs");
  {
    const r = await atomicUpdateOrderStatus("00000000-0000-0000-0000-000000000000", "preparing", "pending");
    if (r.error && !r.error.message.includes("00000000") && !r.error.message.includes("UUID")) {
      ok("Not found error safe (no internal ID leakage)");
    } else {
      bad("Not found error might leak ID", r.error);
    }
  }

  console.log("\n4. Invalid transition error doesn't leak state machine");
  {
    const order = await createTestOrder("preparing");
    const r = await atomicUpdateOrderStatus(order.id, "pending", "preparing");
    if (r.error && !r.error.message.includes("VALID_TRANSITIONS") && !r.error.message.includes("enum")) {
      ok("Invalid transition error safe");
    } else {
      bad("Invalid transition error might leak implementation", r.error);
    }
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  P7.2 ADVERSARIAL SECURITY & CONCURRENCY TESTS             ║");
  console.log("║  El Colorado Resto Bar — Admin API                         ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    await runConcurrencyTests();
    await runAuthorizationTests();
    await runTransitionIntegrityTests();
    await runClientManipulationTests();
    await runCreateOrderSecurityTests();
    await runErrorMessageSafetyTests();
  } catch (e) {
    console.error("\n💥 Test runner crashed:", e);
    fail++;
  } finally {
    await cleanupAll();
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTS: ${pass} passed, ${fail} failed                                ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  process.exit(fail === 0 ? 0 : 1);
}

main();