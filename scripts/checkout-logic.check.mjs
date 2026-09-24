import { checkoutInputSchema, CheckoutValidationError } from "../src/lib/orders/checkout-schema.ts";
import { consolidateLines, validateAgainstCatalog, computeTotalCents } from "../src/lib/orders/checkout-core.ts";

const catalog = new Map();
catalog.set("pizza-mozarella", {
  id: "pizza-mozarella",
  name: "Mozarella",
  presentations: [],
  optionGroups: [],
});
catalog.set("licuado-banana", {
  id: "licuado-banana",
  name: "Banana",
  presentations: [],
  optionGroups: [{ id: "licuado-base", label: "Preparación", values: ["de agua", "de leche"] }],
});
catalog.set("bebida-gaseosas", {
  id: "bebida-gaseosas",
  name: "Gaseosas",
  presentations: ["500 ml", "1,25 L", "1 L"],
  optionGroups: [],
});

let pass = 0;
let fail = 0;
function ok(name) { pass++; console.log(`PASS ${name}`); }
function bad(name, e) { fail++; console.error(`FAIL ${name}:`, e); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "pizza-mozarella", quantity: 1, note: "" }],
    customerName: "Test",
    mode: "takeaway",
  });
  ok("schema valid takeaway");
} catch (e) { bad("schema valid takeaway", e); }

try {
  checkoutInputSchema.parse({ lines: [], customerName: "X", mode: "takeaway" });
  bad("empty lines rejected");
} catch { ok("empty lines rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 0 }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("qty 0 rejected");
} catch { ok("qty 0 rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 21 }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("qty 21 rejected");
} catch { ok("qty 21 rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1.5 }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("qty decimal rejected");
} catch { ok("qty decimal rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: NaN }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("qty NaN rejected");
} catch { ok("qty NaN rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: Infinity }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("qty Infinity rejected");
} catch { ok("qty Infinity rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1, note: "a".repeat(281) }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("note 281 rejected");
} catch { ok("note 281 rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "",
    mode: "takeaway",
  });
  bad("name empty rejected");
} catch { ok("name empty rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "X",
    customerPhone: "1234567890123456789012345678901",
    mode: "takeaway",
  });
  bad("phone too long rejected");
} catch { ok("phone too long rejected"); }

try {
  const p = checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "X",
    customerPhone: "",
    mode: "takeaway",
  });
  if (p.customerPhone === null) ok("phone empty -> null");
  else bad("phone empty -> null", p.customerPhone);
} catch (e) { bad("phone empty transform", e); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "X",
    mode: "invalid",
  });
  bad("mode invalid rejected");
} catch { ok("mode invalid rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "X",
    mode: "dine_in",
  });
  bad("dine_in no table rejected");
} catch { ok("dine_in no table rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1 }],
    customerName: "X",
    mode: "takeaway",
    tableLabel: "5",
  });
  bad("takeaway with table rejected");
} catch { ok("takeaway with table rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1, totalCents: 100 }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("inject total rejected (strict)");
} catch { ok("inject total rejected (strict)"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1, orderNumber: 5 }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("inject orderNumber rejected");
} catch { ok("inject orderNumber rejected"); }

try {
  checkoutInputSchema.parse({
    lines: [{ productId: "x", quantity: 1, publicToken: "abc" }],
    customerName: "X",
    mode: "takeaway",
  });
  bad("inject publicToken rejected");
} catch { ok("inject publicToken rejected"); }

try {
  const c = consolidateLines([
    { productId: "p", presentation: null, selectedOption: null, quantity: 2, note: "" },
    { productId: "p", presentation: null, selectedOption: null, quantity: 2, note: "x" },
  ]);
  if (c.length === 1 && c[0].quantity === 4 && c[0].note === "x") ok("duplicates merged");
  else bad("duplicates merged", c);
} catch (e) { bad("duplicates merged", e); }

try {
  consolidateLines([
    { productId: "p", presentation: null, selectedOption: null, quantity: 20, note: "" },
    { productId: "p", presentation: null, selectedOption: null, quantity: 1, note: "" },
  ]);
  bad("merge >20 rejected");
} catch { ok("merge >20 rejected"); }

try {
  validateAgainstCatalog(
    [{ productId: "nope", presentation: null, selectedOption: null, quantity: 1, note: "" }],
    { catalog },
  );
  bad("unknown product rejected");
} catch { ok("unknown product rejected"); }

try {
  validateAgainstCatalog(
    [{ productId: "bebida-gaseosas", presentation: "3L", selectedOption: null, quantity: 1, note: "" }],
    { catalog },
  );
  bad("bad presentation rejected");
} catch { ok("bad presentation rejected"); }

try {
  validateAgainstCatalog(
    [{ productId: "licuado-banana", presentation: null, selectedOption: null, quantity: 1, note: "" }],
    { catalog },
  );
  bad("missing option rejected");
} catch { ok("missing option rejected"); }

try {
  validateAgainstCatalog(
    [{ productId: "licuado-banana", presentation: null, selectedOption: "de vino", quantity: 1, note: "" }],
    { catalog },
  );
  bad("bad option rejected");
} catch { ok("bad option rejected"); }

try {
  validateAgainstCatalog(
    [{ productId: "pizza-mozarella", presentation: null, selectedOption: "x", quantity: 1, note: "" }],
    { catalog },
  );
  bad("option on product without rejected");
} catch { ok("option on product without rejected"); }

try {
  const v = validateAgainstCatalog(
    [{ productId: "bebida-gaseosas", presentation: "500 ml", selectedOption: null, quantity: 1, note: "" }],
    { catalog },
  );
  if (v.length === 1) ok("valid presentation passes");
  else bad("valid presentation passes", v);
} catch (e) { bad("valid presentation passes", e); }

try {
  const v = validateAgainstCatalog(
    [{ productId: "licuado-banana", presentation: null, selectedOption: "de leche", quantity: 2, note: "" }],
    { catalog },
  );
  if (v.length === 1) ok("valid option passes");
  else bad("valid option passes", v);
} catch (e) { bad("valid option passes", e); }

try {
  computeTotalCents([
    { quantity: 1, unitPriceCents: 2147483647 },
    { quantity: 1, unitPriceCents: 1 },
  ]);
  bad("overflow test - should have thrown");
} catch (e) {
  if (e instanceof CheckoutValidationError && e.code === "TOTAL_OVERFLOW") {
    ok("total overflow rejected (pure layer)");
  } else {
    bad("total overflow rejected", e);
  }
}

try {
  computeTotalCents([
    { quantity: 100000, unitPriceCents: 21475 },
  ]);
  bad("large overflow test - should have thrown");
} catch (e) {
  if (e instanceof CheckoutValidationError && e.code === "TOTAL_OVERFLOW") {
    ok("large total overflow rejected (pure layer)");
  } else {
    bad("large total overflow rejected", e);
  }
}

try {
  const result = computeTotalCents([
    { quantity: 1, unitPriceCents: 2147483647 },
  ]);
  if (result.totalCents === 2147483647) ok("max integer total accepted (pure layer)");
  else bad("max integer total accepted", result);
} catch (e) { bad("max integer total accepted", e); }

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
