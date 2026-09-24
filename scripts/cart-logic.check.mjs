/**
 * Pure cart logic checks (no Vitest — decision 10).
 * Run: node --experimental-strip-types scripts/cart-logic.check.mjs
 * (or via ts import under Node 24 type stripping)
 */
import {
  addLine,
  clampNote,
  clampQuantity,
  lineKey,
  MAX_NOTE_LENGTH,
  MAX_QUANTITY,
  MIN_QUANTITY,
  parsePersistedCart,
  removeLine,
  serializeCart,
  setLineNote,
  setLineQuantity,
  totalItems,
} from "../src/lib/cart-logic.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

// --- simple product add ---
let lines = [];
lines = addLine(lines, { productId: "pizza-mozarella" });
assert("simple_add", lines.length === 1 && lines[0].quantity === 1 && lines[0].presentation === null);

// --- presentation required identity ---
lines = addLine(lines, { productId: "bebida-gaseosas", presentation: "500 ml" });
lines = addLine(lines, { productId: "bebida-gaseosas", presentation: "1 L" });
assert("distinct_presentations_independent", lines.length === 3);

// --- option identity ---
lines = addLine(lines, { productId: "licuado-banana", selectedOption: "de agua" });
lines = addLine(lines, { productId: "licuado-banana", selectedOption: "de leche" });
assert("distinct_options_independent", lines.length === 5);

// --- consolidate same combo ---
lines = addLine(lines, { productId: "pizza-mozarella" });
assert("consolidate_same_key", lines.length === 5 && lines[0].quantity === 2);

// --- consolidate presentation ---
lines = addLine(lines, { productId: "bebida-gaseosas", presentation: "500 ml" });
const gas500 = lines.find((l) => l.productId === "bebida-gaseosas" && l.presentation === "500 ml");
assert("consolidate_presentation", gas500.quantity === 2 && lines.length === 5);

// --- qty bounds ---
lines = setLineQuantity(lines, lineKey(lines[0]), 99);
assert("qty_clamped_max", lines[0].quantity === MAX_QUANTITY);
lines = setLineQuantity(lines, lineKey(lines[0]), 0);
assert("qty_clamped_min", lines[0].quantity === MIN_QUANTITY);
assert("clampQuantity_nan", clampQuantity(Number.NaN) === MIN_QUANTITY);

// --- note bounds ---
const long = "x".repeat(500);
assert("note_clamped_280", clampNote(long).length === MAX_NOTE_LENGTH);
lines = setLineNote(lines, lineKey(lines[1]), long);
const noted = lines[1];
assert("setNote_clamped", noted.note.length === MAX_NOTE_LENGTH);

// --- remove ---
const key0 = lineKey(lines[0]);
lines = removeLine(lines, key0);
assert("remove_line", lines.every((l) => lineKey(l) !== key0));

// --- empty productId rejected ---
const before = lines.length;
lines = addLine(lines, { productId: "  " });
assert("reject_empty_productId", lines.length === before);

// --- serialize / parse roundtrip ---
const json = serializeCart(lines);
const parsed = parsePersistedCart(json);
assert("roundtrip", parsed !== null && parsed.length === lines.length);

// --- corrupt payloads ---
assert("corrupt_json", parsePersistedCart("{not json") === null);
assert("corrupt_not_string", parsePersistedCart(42) === null);
assert("wrong_version", parsePersistedCart(JSON.stringify({ version: 99, lines: [] })) === null);
assert(
  "wrong_shape",
  parsePersistedCart(JSON.stringify({ version: 1, lines: "nope" })) === null,
);
assert(
  "drops_invalid_lines_keeps_valid",
  (() => {
    const p = parsePersistedCart(
      JSON.stringify({
        version: 1,
        lines: [
          { productId: "ok", presentation: null, selectedOption: null, note: "", quantity: 1 },
          { productId: "", presentation: null, selectedOption: null, note: "", quantity: 1 },
          { productId: "bad", presentation: null, selectedOption: null, note: "", quantity: 99 },
        ],
      }),
    );
    return p !== null && p.length === 1 && p[0].productId === "ok";
  })(),
);

// --- totalItems ---
assert("total_items", totalItems(lines) >= 1);

// --- key stability (not name / not index) ---
assert(
  "key_distinguishes_null_vs_empty",
  lineKey({ productId: "a", presentation: null, selectedOption: null }) !==
    lineKey({ productId: "a", presentation: "x", selectedOption: null }),
);

console.log(`RESULT pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
