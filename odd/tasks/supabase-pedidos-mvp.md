# Feature: Pedidos online MVP (Supabase) — El Colorado Resto Bar

## Objective

Transform the current informational one-page landing into a real online ordering
system: customer cart + secure order creation persisted in Supabase Postgres +
staff admin panel with realtime, designed for possible later reuse as a product
for other restaurants without premature abstraction.

## Why

User-approved product evolution (2026-09-24). Full technical plan (phases 0–8)
was analyzed and approved with 10 explicit adjustments (see Approved decisions).

## Approved decisions (user, 2026-09-24)

1. Supabase as backend (Postgres, Auth, RLS, Realtime).
2. MVP modalities: `dine_in` + `takeaway`; delivery out of scope.
3. `customer_name` required; `customer_phone` optional; `table_label` required
   only for `dine_in`.
4. Global correlated order number (`order_number` identity).
5. Product availability via `products.is_available` toggle.
6. Confirmation via `public_token` at `/pedido/[token]`.
7. `price_cents` nullable from day one; never invent or show prices until the
   business provides them.
8. Staff created manually via Supabase Dashboard; no public signup.
9. New-order notice: visual + counter + optional browser sound; sound is never
   a backend dependency nor on the critical path.
10. Testing: pure-logic unit tests later + manual QA now; do NOT add Vitest yet.

## Constraints

- Preserve ALL existing visual/functional decisions (design tokens, fonts,
  AnchorNav behavior, scroll handling, content rules: no invented prices/
  photos/data; `Mozarella` spelling; neutral address label).
- Minimal, controlled changes; no out-of-scope refactors (federico-workflow).
- Dependencies only when justified: `@supabase/ssr`, `@supabase/supabase-js`
  (Phase 0); `server-only` (service-role isolation); `zod` deferred to Phase 4.
- Cart must stay decoupled from the DB (localStorage only until checkout).
- Orders store product snapshots (`product_name_snapshot`, price snapshot).
- Security deny-by-default (RLS); client never trusted for totals/IDs.
- Multi-restaurant: generic table names only; NO `restaurant_id` in MVP.
- No commits/push unless the user explicitly requests them.

## Phases (approved plan)

- [ ] **P0 — Setup**: Supabase deps, env vars, migrations structure, client
      factories (browser / server SSR / service-role isolated). NO cart,
      checkout, orders or admin UI. Checks: tsc + lint + build.
- [ ] **P1 — DB + security base**: tables, enums, constraints, RLS
      deny-by-default, `is_staff()`, idempotent seed from `menu.ts`.
- [x] **P2 — Catalog from DB**: carta renders from Supabase, identical UI.
- [ ] **P3 — Cart + checkout client**: context + localStorage, drawer,
      presentation/option/note per line, minimal customer form.
      **Scope lock (user brief 2026-09-24):** client cart only; NO Supabase
      writes, NO order creation, NO Auth/admin/realtime/API routes/schema.
      Checkout = disabled future CTA only.
- [x] **P4 — Secure order creation**: Server Action + zod, server-side
      validation vs DB, transactional insert with snapshots.
      **Scope lock (user brief 2026-09-24):** checkout contract + tests only;
      `/pedido/[token]` page deferred to later phase. Add `zod` here (justified).
- [ ] **P5 — Admin**: `/admin/login` + `/admin` panel (auth via `getClaims()`,
      status transitions, `is_available` toggle). NOTE: Next 16 uses
      `proxy.ts` (NOT `middleware.ts`) for session refresh.
- [ ] **P6 — Realtime + UX**: subscribe to `orders` only (INSERT/UPDATE),
      fetch item detail on demand, visual counter + optional sound,
      loading/empty/error/success states, responsive.
- [ ] **P7 — Hardening**: RLS audit, rate limiting on order creation, adversarial
      manual matrix (anon cannot read/write arbitrary orders, cannot skip states).
- [ ] **P8 — Testing/QA**: pure-logic unit tests (runner decision pending —
      user deferred Vitest) + manual QA checklist. E2E deferred.

## Phase 3 task list (this work unit)

- [x] P3-T1 Inspect current contract: Carta/ProductRow, menu/catalog types,
      Header/ui tokens, client component patterns (MenuNav/AnchorNav),
      package.json (no cart deps). Route: inline (task-tool unavailable).
- [x] P3-T2 Write this checklist BEFORE first source write. Route: inline.
- [x] P3-T3 Cart state model + pure logic module: `CartLine` keyed by
      `productId` + `presentation` + `selectedOption` (never index/name);
      qty clamp 1–20; note clamp 280; add consolidates identical keys;
      distinct combos = distinct lines; validate/normalize helpers for
      localStorage. Route: inline (cohesive pure module).
- [x] P3-T4 localStorage persistence: versioned key; tolerant parse
      (corrupt/old/invalid → empty cart, never throw); post-mount
      hydration only (SSR/first client render = empty → no mismatch);
      save after hydrated; no sensitive data stored.
- [x] P3-T5 CartProvider context: open/close, add/updateQty/setNote/remove,
      derived counts; mounted in layout; no Supabase imports.
- [x] P3-T6 UI: CartButton + badge in Header; CartDrawer mobile/desktop
      (empty / lines / unavailable / disabled checkout CTA / total
      "Total a confirmar"); focus/Escape/backdrop; reuse design tokens.
- [x] P3-T7 ProductRow add controls: simple add; required presentation
      before add; required category option before add; no invented values;
      pass lightweight catalog index from server Carta for name resolve +
      availability of persisted productIds.
- [x] P3-T8 Verify: tsc/lint/build; pure-logic script checks (add/
      consolidate/qty/note/corrupt storage); grep no supabase writes in
      cart modules; document UI/hydration checks (no Vitest, decision 10).
- [x] P3-T9 Report: files, state model, persistence/hydration strategy,
      unavailable-product behavior, test results, pendients. NO Phase 4,
      NO commits.

Verification mode: no test runner (Phase 8 deferred) → tsc/lint/build +
node script for pure cart logic + static greps + code-path review for
hydration. No work-unit commits — standing repo policy.

## Phase 4 task list (this work unit — secure order creation)

Scope lock (user brief 2026-09-24): checkout contract + Zod + secure Server
Action + revalidation vs Supabase + server-side total + atomic orders+items
+ tests. NO admin, NO staff login, NO realtime, NO `/pedido/[token]` page,
NO rate limiting, NO emails/notifications, NO design changes beyond wiring
the existing drawer CTA. Client never controls price/total/availability/
names/presentations/options/order_number/public_token.

- [x] P4-T1 Inspect before write: migrations `20260924120000_init_ordering_
      schema.sql` + `20260924120100_seed_catalog_from_menu.sql` (columns,
      enums, CHECKs, constraints, grants, existing functions), supabase
      clients, `cart-logic.ts`, `cart-store.ts`, `catalog.ts`,
      `catalog-index.ts`, `cart/*`, `page.tsx`, `layout.tsx`, feature doc,
      CLI 2.117.0 + link confirmed. Route: inline (read-only).
- [x] P4-T2 Write this checklist BEFORE first source write + install `zod`
      (justified in Constraints: deferred to Phase 4). Route: inline.
- [x] P4-T3 Pure layer: `src/lib/orders/checkout-schema.ts` (strict zod:
      rejects unknown keys like total/orderNumber/publicToken/price;
      quantity int 1–20; note ≤280; name 1–80 trimmed; phone ≤30 → null when
      blank; mode enum; tableLabel coherent with mode) + `checkout-core.ts`
      (server-side duplicate consolidation on productId+presentation+
      selectedOption with cart merge semantics, capped merge ≤20; catalog
      validation for existence/availability/presentations/options; integer-
      cents total with overflow guard; typed domain error codes).
      Route: inline (cohesive pure modules, same research surface).
- [x] P4-T4 Server Action `src/lib/actions/create-order.ts` (`"use server"`):
      zod → RPC call via anon SSR client (NO service-role) → small serializable
      result `{ok,orderNumber,publicToken}` or `{ok:false,code,message}`.
      DEVIATION: the planned 2-query catalog preflight was replaced by the RPC
      itself (single round trip + single transaction; the RPC re-validates
      everything against the DB, which is stronger than a 2-query preflight).
      `consolidateLines`/`validateAgainstCatalog`/`computeTotalCents` remain
      tested pure modules; the action path delegates final validation to SQL.
- [x] P4-T5 Migration `20260924120501_fix_create_order_rpc_qualified.sql`
      (final; supersedes `20260924120200` + `20260924120500`): SECURITY
      DEFINER `create_order(p_customer_name, p_customer_phone, p_mode,
      p_table_label, p_lines jsonb)` with `search_path=''`; re-validates
      EVERYTHING (envelope + per-line shape + product exists + is_available +
      exact presentations + category-option values + qty/note bounds +
      mode/table CHECK semantics); consolidates duplicates via temp table with
      '' sentinel for NULL presentation/option (PK cannot hold NULL) + ON
      CONFLICT merge (≤20); integer-cents total (NULL when any price NULL,
      overflow guard); single-transaction inserts of orders + order_items with
      DB snapshots; explicit EXECUTE grant anon+authenticated only, revoked
      from PUBLIC/service_role; pushed live (`supabase db push`).
      GOTCHA: `returns table` + INSERT RETURNING `order_number` is ambiguous
      (plpgsql OUT var vs column) → qualify `orders.order_number`.
- [x] P4-T6 Minimal UI: `CheckoutForm` client component in drawer (mode
      pills dine_in/takeaway, name required, phone optional, tableLabel
      required for dine_in, pending/error/success states, disabled while
      unavailable lines exist; form receives `lines` prop so payload is
      honest); CartDrawer enables the CTA, shows success panel with order
      number + token, clears cart on success, resets checkout state on close.
      Existing tokens only.
- [x] P4-T7 Tests: `scripts/checkout-logic.check.mjs` (pure layer: 24 checks
      PASS — valid payload, empty lines, qty 0/21/1.5, unknown product, bad
      presentation/option, missing option, option on product without options,
      note >280, name empty, phone >30, phone ""→null, bad mode, dine_in w/o
      table, takeaway w/ table, injected total/orderNumber/publicToken
      rejected, duplicates merged, merge >20, valid presentation/option) +
      `scripts/order-rpc.check.mjs` (LIVE anon REST vs cloud: 6 checks PASS —
      happy takeaway, unknown product rejected, happy dine_in full fields,
      bad presentation rejected, direct anon INSERT denied by RLS, duplicates
      merged; every test order cleaned by public_token via service-role).
      NOTE: live unavailable-product + non-null-price cases not reachable via
      API (no staff write path) → covered at pure layer only; documented.
- [x] P4-T7b Post-audit corrections (Nemotron 3 Ultra brief 2026-09-24:
      2 HIGH + 1 LOW, must fix before closing P4): (1) RPC overflow guard
      `v_max_safe_sum := 2147483647` (INTEGER max, was BIGINT max while the
      final cast is `::integer` → silent overflow); checked BEFORE the cast;
      (2) max 100 lines per order (`jsonb_array_length(p_lines) > 100` →
      `P0001 'too many lines'`, before iteration → DoS guard); (3) zod
      `quantity` gains `.finite()` (rejects NaN/Infinity; keeps `.int()`
      `.min(1)` `.max(20)`). New corrective migration
      `20260924120502_fix_overflow_and_line_limit.sql` (NOT editing history)
      applied live via `supabase db push`; grants/architecture unchanged
      (SECURITY DEFINER, `search_path=''`, EXECUTE anon+authenticated only).
      Tests extended: pure layer 24→29 PASS (NaN/Infinity rejected, overflow
      rejected pure-layer ×2, max 2_147_483_647 accepted); live 6→9 PASS
      (exactly 100 lines accepted via 6 valid distinct combos cycling ≤20/merge,
      exactly 101 rejected, high-qty order processed no overflow).
- [x] P4-T8 Final checks: `pnpm exec tsc --noEmit` PASS, `pnpm lint` PASS
      (0 problems), `pnpm build` PASS, both test scripts PASS. Diff audit:
      no service-role in client, no secrets in app code, no `as any`, no
      dynamic SQL, no sensitive logs; service-role only in the cleanup script
      (reads `.env.local` directly, never imports the `server-only` module).
      NO auto-commit (repo policy).
- [x] P4-T9 Report: files, migration, action contract, atomicity strategy,
      validations, test results, risks/pending decisions; explicit
      confirmation the client never controls price/total/availability/
      order_number/public_token.

Route declaration: inline throughout (task-tool delegation unavailable in
this runtime — recorded P0/P1/P2/P3); no work-unit commits (repo policy).

## Phase 0 task list (this work unit)

- [x] P0-T1 Re-inspect repo before modifying (git status, .gitignore, src tree,
      package.json, Next 16 local docs). Route: inline (read-only; 1–3 files per
      decision; task-tool delegation unavailable in this runtime).
- [x] P0-T2 Verify patterns: local Next 16 docs (`cookies()` async; Server
      Actions = untrusted entry points) + official `@supabase/ssr` guide
      (createBrowserClient/createServerClient, proxy rename in Next 16).
      Route: inline (research; task-tool delegation unavailable).
- [x] P0-T3 Install deps: `@supabase/ssr`, `@supabase/supabase-js`,
      `server-only`. Route: inline (single mechanical command).
- [x] P0-T4 Create `.env.example` (3 vars) + `.gitignore` negation; keep
      `.env.local` untracked (user supplies real credentials). Route: inline.
- [x] P0-T5 Create client factories `src/lib/supabase/{client,server,service-role}.ts`
      with strict key separation (`server-only` guard on service-role).
      Route: inline (justified: 3 small cohesive modules, single researched
      pattern, task-tool delegation unavailable in this runtime).
- [x] P0-T6 Create `supabase/migrations/` structure (schema deferred to P1).
      Route: inline.
- [x] P0-T7 Verify: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.
      Known environmental failures: none on base.
      Result 2026-09-24: tsc=0 errors, lint=0 errors, build=OK (48s compile,
      route `/` still static; eslint printed a pre-existing upstream
      deprecation notice for eslint@9.39.5 — not a failure).
- [x] P0-T8 Report exact files/deps/commands/results + P1 pending decisions.

## Acceptance criteria (Phase 0)

- Dependencies installed and lockfile updated.
- `.env.example` committed-trackable (gitignore negation), `.env.local` ignored.
- Service-role client impossible to import from client bundles (`server-only`).
- SSR server client reads/writes session cookies per official pattern
  (await cookies(); setAll try/catch for Server Components).
- No changes to any existing component/page/layout/styles/content.
- tsc: 0 errors; lint: 0 errors; build: OK.

## TDD / checks

- TDD mode: **disabled** — no test runner in project; user explicitly deferred
  Vitest (decision 10). Source: user instruction 2026-09-24.
- Runner (when enabled later): TBD.
- Phase 0 checks: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.

## Delivery strategy

- Strategy: `ask-on-risk` (default; user did not specify). Chain strategy: not
  yet needed (no >400-line forecast approved for slicing yet).
- Commits: NOT part of this work unit unless the user explicitly requests them.

## Phase 1 task list (this work unit)

- [x] P1-T1 Re-inspect env: CLI present (npm global, 2.117.0), `config.toml`
      from `supabase init`, link confirmed (`adminpanel` / zzbkqteldsfbqomgosnt),
      migrations dir ready. DISCREPANCY: `.env.local` missing — the 3 values
      were filled into `.env.example` instead. Fix: copy mechanically to
      `.env.local`, restore `.env.example` to empty template (it is
      gitignore-exempt — filled it would leak the service key to git).
      Route: inline (read-only + mechanical copy).
- [ ] P1-T2 Write versioned migration `20260924120000_init_ordering_schema.sql`:
      5 tables (categories, products, orders, order_items, staff_users),
      2 enums, FKs/constraints, `order_number` identity+unique, `public_token`
      unique, `price_cents` nullable, `is_available`, `updated_at` triggers,
      `is_staff()` + `get_order_by_token()` (SECURITY DEFINER,
      `set search_path = ''`, minimal EXECUTE), RLS enabled on all tables,
      explicit minimal grants, default-privilege revokes, 6 policies
      (catalog public read; staff-only order access; NO anon table access to
      orders — token RPC only). Route: inline (single researched pattern;
      task-tool delegation unavailable in this runtime).
- [ ] P1-T3 Write idempotent seed `20260924120100_seed_catalog_from_menu.sql`
      derived from `src/lib/menu.ts` (8 categories / 38 products; ON CONFLICT
      refreshes label/featured/options/presentations/sort_order/name only;
      NEVER touches `is_available`; never sets `price_cents` → stays NULL;
      no deletes). Route: inline (transcription from already-read menu.ts).
- [x] P1-T4 Self-review SQL before push: RLS correctness, security definer
      (`search_path`), grant minimality, enumeration paths, customer-data
      exposure, destructive operations (must be none). DONE — all clean;
      RPC deliberately omits `customer_phone`/`public_token` from response.
- [x] P1-T5 `supabase db push` — DONE 2026-09-24, both migrations applied
      with zero SQL errors (creation-only).
- [x] P1-T6 Real security tests vs cloud DB — DONE: 62 checks, 0 security
      failures (anon catalog 8/38 + all price_cents NULL; anon denied on
      orders/items/staff_users and rpc/is_staff; token RPC single-order only,
      no cross-leak, no phone/token fields, random→null; constraints
      table_label/customer_name/qty; non-staff RLS 0 rows, column-update
      deny, DELETE/staff_users denied, is_staff()=false).
      Expected-behavior note: PostgREST → 404 when RPC arg missing
      (function not invoked), `p_token=null` → 200 null, bad uuid → 400.
      Test data cleaned (orders + non-staff user deleted).
- [x] P1-T6b Staff-path tests (manual Dashboard user + staff_users row
      provided by user) — DONE: +52 checks, 0 failures.
      is_staff()=true; staff reads orders+items; allowed: status
      pending→preparing→ready (updated_at trigger bumped), product
      is_available flips visible to anon. DENIED 403: customer_name,
      customer_phone, public_token, mode+table_label, total_cents,
      created_at, sneaky {status,customer_name} combo (status stayed
      ready), order_items.quantity, product price/name, categories.label,
      POST/DELETE orders+items+products, GET staff_users (even for staff).
      order_number → 400 identity protection (layer 2; not in grant either).
      Final integrity: every protected field unchanged, counts exact.
      Session via admin generate_link type=recovery (this GoTrue rejects
      type=magic_link: "Invalid email action link type"); password never
      touched; logout 204; test orders deleted; staff account KEPT.
      Note: staff_users is API-invisible to service_role too (by design) —
      membership proven via is_staff() probe instead of table read.
- [x] P1-T7 Report delivered. NO Phase 2 started.

## Phase 2 task list (this work unit)

- [x] P2-T1 Inspect current contract: `menu.ts` (types + seed data),
      `Carta.tsx` (server component; imports `menuCategories` value +
      `MenuCategory`/`MenuProduct` types; renders category.options, NEVER
      product.optionIds; pendingNotes never rendered; treatment uses
      featured + products.length), `MenuNav.tsx` (client, receives props —
      no menu import), `page.tsx` (`<Carta />` no props),
      `supabase/server.ts` (publishable key only, cookies()).
      Grep: `@/lib/menu` imported only by Carta.tsx.
      Route: inline (task-tool delegation unavailable — recorded P1).
- [x] P2-T2 Create `src/lib/catalog.ts`: `import "server-only"`; server
      Supabase client (publishable/RLS — NO service-role); exactly 2 queries
      via Promise.all (categories order=sort_order; products order=sort_order,
      id); explicit mapper → existing `MenuCategory`/`MenuProduct` contract
      (types re-exported from catalog so render path has zero menu imports);
      `is_available=false` products excluded; category hidden if 0 available
      products; explicit error → throw (no menu.ts fallback, no invented
      data, logs without credentials); no dev fallback implemented.
- [x] P2-T3 Wire render path: `Carta` becomes async and consumes
      `getMenuCatalog()`; menu.ts gains seed-only header note; NO visual
      changes, no new deps.
- [x] P2-T4 Static checks: no runtime menu.ts import in render path;
      no service-role in client/components; no credentials in code/logs;
      query count = 2 (code review, no N+1).
- [x] P2-T5 `pnpm exec tsc --noEmit`; `pnpm lint`; `pnpm build`.
- [x] P2-T6 Runtime proof vs built app: server HTML has 8 categories +
      38 products + presentations/options + seed sort order; flip
      `is_available=false` via API → product disappears → restore;
      anon RLS path proven by the page itself (publishable key).
- [x] P2-T7 Report. NO Phase 3.

Verification mode: no test runner configured for this project yet
(Phase 8) → ordinary functional checks (tsc/lint/build + runtime HTML
asserts against live Supabase). No work-unit commits — standing repo
policy: commits only on explicit user request.

## Progress / evidence

### Phase 4 — Secure order creation (2026-09-24) — COMPLETE

- Created `src/lib/orders/checkout-schema.ts`: strict zod schemas against the
  brief (`.strict()` rejects injected `totalCents`/`orderNumber`/`publicToken`/
  `price`; qty int 1–20; note ≤280; name 1–80 trimmed; phone ≤30 with
  `"" → null` transform; mode enum; tableLabel coherent with mode via
  superRefine). Constants + `CheckoutErrorCode` map + `CheckoutValidationError`.
- Created `src/lib/orders/checkout-core.ts`: `consolidateLines` (merge on
  productId+presentation+selectedOption, non-empty note wins, capped ≤20),
  `validateAgainstCatalog` (existence/presentations/options; option required
  only when category has a primary group — matches `licuados`), `computeTotalCents`
  (integer cents, NULL when any price NULL, ≤ 2_147_483_647 guard — int4 column),
  `isCheckoutValidationError`. Pure modules tested by `checkout-logic.check.mjs`;
  the action path relies on the RPC for final validation (see deviation, P4-T4).
- Created `src/lib/actions/create-order.ts`: `"use server"` + `import "server-only"`;
  zod parse → RPC via anon SSR client (NO service-role) → `{ok,orderNumber,
  publicToken}` or `{ok:false,code,message}`; `revalidatePath("/")`; logs never
  include payloads/tokens; maps RPC errors (PostgREST `code`/`message` — P0001
  family for domain errors; UI copies are generic, raw message passed through
  for staff debugging).
- Migration (final file `20260924120501_fix_create_order_rpc_qualified.sql`
  after two fixes): SECURITY DEFINER `create_order(text,text,order_mode,text,
  jsonb)` with `search_path=''`, `returns table(order_number bigint,
  public_token uuid)`. Re-validates envelope (lines array non-empty, name/phone/
  mode/table bounds), per-line shape (productId, presentation/option ≤60 with
  trim, qty via safe cast 1–20, note ≤280) then against DB (product exists +
  is_available, presentations via `array_position`, options via
  `c_opts->0->'values'`), consolidates via `tmp_consol` (PK with `''` sentinel
  for NULL presentation/option; ON CONFLICT sum qty, non-empty note wins,
  merge >20 rejected), computes integer-cents total (bigint sum, NULL policy,
  overflow guard), inserts `orders` + `order_items` in ONE transaction with
  DB snapshots. Grants: EXECUTE anon+authenticated only; revoked from
  PUBLIC + service_role. Pushed live (`supabase db push`).
  GOTCHAS: PK implies NOT NULL → NULL presentation/option broke inserts
  (fixed with `''` sentinel); `returns table` OUT var `order_number` is
  ambiguous with the column in `INSERT ... RETURNING` → qualify
  (`orders.order_number`); PostgREST returns `table` as an ARRAY → action reads
  `rows?.[0]`; `supabase db push` records migration names — editing an already
  pushed file does nothing → fixed via new numbered migration.
- UI: `CheckoutForm.tsx` (mode pills, name required max 80, phone optional max
  30, table required for dine_in max 40, "el total se confirma en barra";
  receives `lines` prop so payload is honest; pending/error states) mounted in
  `CartDrawer.tsx`: CTA enabled ("Finalizar pedido"), swap to form + inline
  submit ("Confirmar pedido"), success panel (order number + token), `clear()`
  on success, checkout state reset in `handleCloseCart` (no effect after early
  return — hooks rule). Existing tokens only; unavailable lines keep CTA disabled.
- Tests: `scripts/checkout-logic.check.mjs` → **29 PASS / 0 FAIL** post-audit
  (pure layer brief matrix + NaN/Infinity rejected + overflow rejected ×2 +
  max 2_147_483_647 accepted). `scripts/order-rpc.check.mjs` → **9 PASS / 0 FAIL**
  (live anon REST vs cloud: happy takeaway + happy dine_in full fields (pizza +
  licuado "de leche"), unknown product/bad presentation rejected, anon direct
  INSERT denied by RLS, duplicates merged, exactly 100 lines accepted, exactly
  101 rejected, high-qty order processed without overflow; every test order
  cleaned by public_token via service-role client in the script — never imports
  the `server-only` module, reads `.env.local` directly). Live
  unavailable-product/non-null-price cases not reachable via API (no staff write
  path) → pure-layer coverage only, documented gap.
- Post-audit corrections (Nemotron brief 2026-09-24): migration
  `20260924120502_fix_overflow_and_line_limit.sql` — `v_max_safe_sum :=
  2147483647` (was BIGINT max vs `::integer` cast), `jsonb_array_length(p_lines)
  > 100` → P0001; applied live; verified remote up-to-date via dry-run. zod
  `.finite()` on quantity. Over/under boundary: pure-layer rejects
  `2147483647+1`, accepts exactly `2147483647`.
- Final checks: `pnpm exec tsc --noEmit` = 0; `pnpm lint` = 0 problems;
  `pnpm build` = OK. `tsconfig.json` gained `allowImportingTsExtensions: true`
  (needed so `checkout-core.ts` can import `./checkout-schema.ts` explicitly
  for Node ESM type-stripping in the pure test; safe with `noEmit: true`).
  Diff audit: no service-role in client components, no secrets in app code,
  no `as any`, no dynamic SQL, no sensitive logs. NOT committed (repo policy).

### Phase 2 — Catalog from DB (2026-09-24) — COMPLETE

- Created `src/lib/catalog.ts`: server-only data layer; `getMenuCatalog()`
  uses `createServerSupabaseClient()` (publishable key + RLS); exactly
  2 queries via Promise.all (categories `order=sort_order`; products
  `.eq("is_available", true)` `order=sort_order,id`); explicit mapper to
  existing `MenuCategory`/`MenuProduct`/`MenuOption` types (re-exported
  from catalog via `export type` so render path has zero `menu.ts` value
  imports); category hidden when 0 available products; errors throw
  explicit message after logging only Supabase `message`+`code` (no
  credentials); NO fallback to `menu.ts`.
- Modified `src/components/Carta.tsx`: async server component; consumes
  `getMenuCatalog()`; types from `@/lib/catalog`; JSX/visual unchanged.
- Modified `src/lib/menu.ts`: header note — seed/transcription source only;
  runtime must not import `menuCategories` value.
- `src/app/page.tsx` unchanged (`<Carta />` works with async child).
- Checks: `pnpm exec tsc --noEmit` = 0; `pnpm lint` = 0; `pnpm build` = OK;
  route `/` is now dynamic (ƒ) due to `cookies()` in SSR Supabase client.
- Static: only `import type` from `@/lib/menu` remains in `src/`;
  no service-role import outside `service-role.ts`; no `eyJ`/`sb_*` literals
  in `src/`; catalog has exactly 2 `.from()` calls; logs contain message+code only.
- Runtime render proof: STATUS 200, **22 PASS / 0 FAIL** (8 category ids/labels,
  37 unique product names + Ananá×2 = 38 rows, presentations `500 ml · 1,25 L · 1 L`,
  licuados `Preparación: de agua o de leche`, category sort_order sequence).
- `is_available=false` flip proof (service-role REST Patch on `pizza-mozarella`):
  **13 PASS / 0 FAIL** — baseline present → flip DB false → HTML exact
  `Mozarella` absent while `Mozarella doble`/section remain → restore true →
  present again; `FINAL_is_available=True`.
- Residual `next start -p 3100` PID 2060 from interrupted tool call was killed;
  after final proof `PROCS_AFTER=0`.
- Known finding (reported, NOT fixed in P2): seed product IDs differ from
  `menu.ts` for sandwiches (`sandwich-arabe/miga/casero` vs `sandwich-tostado-*`),
  cafeteria (`cafe`… vs `cafe-cafe`…), and `cerveza-stella` vs `cerveza-stella-artois` —
  names/presentations/options/categories match; UI unaffected; orders empty so a
  later alignment migration is trivial; no new migration without user approval.
- Route: inline (task-tool delegation unavailable); no commits (repo policy).

### Phase 3 — Cart + checkout client (2026-09-24) — COMPLETE

Interrupted-run recovery: the tool aborted during T3; working-tree inspection
showed T3–T7 code already written and unverified (`git status`: 8 modified +
cart modules untracked; orphan `next start -p 3100` PID 3868 killed). This run
verified each artifact against its contract, fixed nothing that was correct,
then executed T8/T9.

- `src/lib/cart-logic.ts` (T3): pure domain module, no React/localStorage/
  network. `CartLine` = `productId`+`presentation`+`selectedOption` (structural
  `lineKey()` with `\u0000` join; never name or index). `clampQuantity` 1–20
  (NaN→1), `clampNote` 280. `addLine` consolidates identical keys (merge keeps
  existing note when new note empty; delta clamped at 20). `setLineQuantity`,
  `setLineNote`, `removeLine`, `totalItems`, `parsePersistedCart` (versioned
  envelope; corrupt/wrong-version/wrong-shape → `null`; invalid lines dropped;
  duplicate keys merged), `serializeCart` (filters+normalizes).
- `src/lib/cart-store.ts` (T4): versioned key `elcolorado.cart.v1`; tolerant
  `readFromStorage` (never throws); stable `getCartServerSnapshot() = EMPTY` →
  SSR and first client render agree (no hydration mismatch); browser snapshot
  cached and refreshed via `useSyncExternalStore`; writes only on user mutation
  (post-hydration); no sensitive data.
- `src/components/cart/CartProvider.tsx` (T5): context with `lines`, `hydrated`,
  `isOpen`, `openCart`/`closeCart`/`toggleCart`, `itemCount`, `add`/
  `updateQuantity`/`updateNote`/`remove`/`clear`; mounted in root layout body;
  zero Supabase imports. Hydration flag flips in render phase (React docs
  "adjusting state during render" — no setState-in-effect lint error).
- `src/components/cart/CartButton.tsx` + `CartDrawer.tsx` (T6): header trigger
  with badge (only after `hydrated`); drawer = full-height right panel (mobile)
  / `max-w-md` (desktop); empty state, lines with qty stepper (+/-, 1–20),
  per-line note (280 max with counter), per-line remove, unavailable-line
  banner + disabled stepper, disabled future checkout CTA ("Finalizar pedido"
  disabled with title, footer note), total always "Total a confirmar"; focus
  close on open, Escape closes, backdrop click closes, body scroll lock;
  tokens: `bg-ink/70 backdrop-blur`, `text-cream`, `text-cream-dim`,
  `bg-ink-soft`, `border-line`, `bg-brand`, `text-brand-bright`, `font-display`.
- `ProductAddControl.tsx` + `catalog-index.ts` + `CatalogProvider.tsx` (T7):
  per-row add control. No presentations/options → single "Agregar" (adds
  qty 1; "Agregado ✓" flash; "Ver carrito" link after). Presentations and/or
  category option group → radio selectors, add disabled until every required
  selection made (`Elegí la presentación…` hint); values come only from the
  catalog (no invented options); category options resolved by primary group
  (seed has exactly one: `licuados/Preparación`). Server builds a serializable
  catalog index DTO once in `page.tsx` from the same `getMenuCatalog()` result
  that renders `Carta` (no client refetch, no N+1); drawer resolves names and
  availability from it (`catalog.productIds.has(line.productId)`).
- Wiring: root `layout.tsx` mounts `CartProvider`; `page.tsx` becomes async,
  fetches catalog once, passes it to `Carta` (presentational subtree) and
  builds the DTO for `CatalogProvider`, and mounts `CartDrawer`; `Header.tsx`
  adds `CartButton` next to the mobile menu toggle; `Carta.tsx` `ProductRow`
  renders `ProductAddControl` with `presentations` + `optionGroups`.
- Grep result (user-requested): the only `@/lib/menu` import left in `src/` is
  `src/lib/catalog.ts:3` — `import type { MenuCategory, MenuOption, MenuProduct }`,
  a legitimate compile-time-only import (erased at build; re-exported for the
  render contract). NOT a runtime dependency; no changes made.
- Checks (T8), 2026-09-24:
  - `node --experimental-strip-types scripts/cart-logic.check.mjs` → **20 PASS /
    0 FAIL** (add, distinct presentations/options, consolidate, qty max/min/NaN,
    note clamp, remove, reject empty id, serialize/parse roundtrip, corrupt
    JSON, wrong version, wrong shape, drops invalid lines, totalItems, key
    stability). Only Node warning: MODULE_TYPELESS_PACKAGE_JSON (cosmetic).
  - `pnpm exec tsc --noEmit` → 0 errors. `pnpm lint` → 0 errors.
  - `pnpm build` → OK (route `/` dynamic ƒ; `/icon.jpg` + `_not-found` static).
  - Static greps: 0 supabase/.from/insert/update/delete matches in
    `src/components/cart/`; 0 runtime `menuCategories` value imports in `src/`.
  - Functional SSR (built app `next start -p 3100`, orphan restored): **17 PASS /
    0 FAIL** — page 200; CartButton aria-label; ≥38 add controls; ≥5 radio
    selectors; "Presentación" legend; "Preparación de agua o leche"; drawer
    absent from SSR (closed); checkout CTA/total/empty-state absent from SSR;
    badge absent from SSR; **0 user-visible `$`/price strings** (earlier `$`
    hits were Next/React internals like `$undefined`, not content); Mozarella/
    Banana/La carta/Pizzas/Visitar still render.
  - Hydration: verified by code-path review (stable empty server snapshot +
    `hydrated` gating, no SSR mismatch markers); real browser interaction
    (open drawer, add flows) left as manual QA per decision 10 (no Vitest).
- Test server killed after proof (`PROCS_AFTER=0` for the started instance).
- Route: inline (task-tool delegation unavailable); no commits (repo policy).

### Phase 1 addendum — staff path (2026-09-24) — COMPLETE

- User created staff auth user (auto-confirm) + `staff_users` row manually.
- Session obtained non-invasively: admin `generate_link` type=`recovery` →
  `verify` token_hash (this GoTrue rejects `type=magic_link`). Password
  untouched; session revoked via logout (204).
- **52 checks / 0 failures** (full matrix in session transcript): identity
  (`is_staff()=true`), reads, allowed status+is_available updates with
  trigger, column-grant denials on every protected field, insert/delete
  denials, atomic deny of sneaky multi-field PATCH, final integrity read.
- First attempt's `403 permission denied for table staff_users` (service
  role) confirmed the design: staff_users is API-invisible to EVERY API
  role, owner/SQL only. Membership validated through `is_staff()` itself.
- Cleanup: test orders (numbers 6,7) deleted; staff user + row kept.

### Phase 1 — DB + base security (2026-09-24) — COMPLETE (staff-path tests pending manual user)

- Env fixed: the 3 values had been filled into `.env.example` (Next.js does
  not load it) → copied mechanically to `.env.local`, `.env.example` restored
  to empty template; `.env.local` gitignored (`.gitignore:34 .env*`);
  nothing ever committed (repo policy: no commits unless asked).
- `supabase db push` applied cleanly:
  - `20260924120000_init_ordering_schema.sql` — enums `order_mode`/
    `order_status`; tables `categories`, `products`, `orders`,
    `order_items`, `staff_users`; identity `order_number`+unique,
    `public_token` unique, mode/table_label check, qty 1–20, note ≤280,
    `price_cents` nullable, `is_available`; `updated_at` triggers;
    `is_staff()` + `get_order_by_token()` SECURITY DEFINER with
    `search_path=''`; RLS on all 5 tables; 6 policies; explicit minimal
    grants (anon catalog-read only; staff column-limited updates;
    service_role sole order writer; `staff_users` API-invisible);
    default-privilege revokes for future objects.
  - `20260924120100_seed_catalog_from_menu.sql` — idempotent, 8 categories /
    38 products from `menu.ts`, never touches `is_available`, never sets
    `price_cents` (stays NULL).
- Security matrix vs cloud: **62 checks, 0 security failures** — see P1-T6.
- Residual notes for later phases: (1) re-verify grants when creating
  future tables (default-privileges may be role-scoped); (2) Phase 4 must
  send `customer_phone: null` for blank input (check rejects empty string).
- Route: inline throughout (task-tool delegation unavailable in runtime).

- 2026-09-24: **P0 COMPLETE (T1–T8).**
  - Deps: `@supabase/ssr@0.12.7`, `@supabase/supabase-js@2.117.0`,
    `server-only@0.0.1`.
  - Created: `.env.example`, `src/lib/supabase/client.ts`,
    `src/lib/supabase/server.ts`, `src/lib/supabase/service-role.ts`,
    `supabase/migrations/.gitkeep`.
  - Modified: `.gitignore` (added `!.env.example`), `package.json`,
    `pnpm-lock.yaml`.
  - Checks: `pnpm exec tsc --noEmit` = 0 errors; `pnpm lint` = 0 errors;
    `pnpm build` = OK (route `/` remains static — no forced dynamic rendering).
  - NOT committed (no explicit user request). Next: user supplies Supabase
    project credentials in `.env.local`, then confirm start of P1 (schema,
    RLS, seed).
- 2026-09-24: **P1 BLOCKED before start — environment gate (user-mandated).**
  Inspection results: Supabase CLI NOT on PATH; NOT a local package;
  `supabase/config.toml` missing; `.env.local` missing; Docker not installed.
  Per user instruction ("if CLI unavailable: report exactly what is missing
  and stop, do not install"): NO CLI installed, NO migration or seed files
  created, NO SQL executed, NO security tests run (anon/authenticated/staff
  tests all require a live database + roles). Staff user (manual dashboard
  creation, decision 8) also still nonexistent. No TypeScript changed this
  phase → tsc/lint/build not rerun (user's conditional). Awaiting: CLI install
  decision, Supabase project + `supabase login`/`link`, `.env.local` values,
  then P1 can proceed (init/config, migrations, seed, security matrix).

## Rationale (meaningful choices)

- `server-only` dependency: guards the user's explicit "never mix service-role
  with SSR client" requirement at build time (build fails on client import),
  which a plain `typeof window` check cannot do.
- Proxy deferred to P5: no authenticated sessions exist before the admin panel;
  adding it now would touch every matched route without purpose (minimal change
  principle).
- Env names follow current official Supabase Next.js guide
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); legacy anon key also accepted.
