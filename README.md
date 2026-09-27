# El Colorado Resto Bar — Web

Sitio oficial de **El Colorado Resto Bar** (La Consulta · San Carlos · Mendoza).
Landing one-page con la carta del negocio y datos de contacto, con **pedidos online en curso** (MVP).

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres + RLS) · Zod · `next/font`.

- No hay precios inventados: el menú PDF oficial no incluye precios. `price_cents` queda `NULL` hasta que el negocio los provea; la UI no muestra ni inventa precios.
- No hay fotos falsas: la galería se mostrará cuando existan fotos reales del negocio.
- Los pedidos se crean con **RLS deny-by-default**: el cliente nunca controla precios, totales, disponibilidad, `order_number` ni `public_token`.

---

## Definición de Fases

Este proyecto distingue tres tipos de fases:

| Tipo | Fases | Descripción |
|------|-------|-------------|
| **MVP Core** | F9–F15 | Funcionalidades base del pedido online (carrito, checkout, realtime, admin, CRUD carta, multi-tenant) |
| **UX Improvements** | Phase 1–2 | Mejoras de usabilidad sobre el MVP ya funcional (checkout público, panel admin) |
| **Bug Fixes** | — | Correcciones puntuales de incompatibilidades entre UI y contratos de BD/RPC |

> **Importante:** Las fases de UX Improvement (Phase 1, Phase 2) se ejecutan **después** de que el MVP core correspondiente esté completo y testeado. No son lo mismo que F9–F15.

---

## Estado del MVP Core (F9–F15)

Fases del plan aprobado por el usuario; detalle de tareas y evidencia en `odd/tasks/supabase-pedidos-mvp.md`.

| Fase | Nombre | Estado | Notas |
|------|--------|--------|-------|
| **F9** | Carrito + navegación de cliente | ✅ **COMPLETA** | CartProvider, CartDrawer, CartButton, ProductAddControl, CatalogProvider, localStorage versionado, SSR snapshot estable |
| **F10** | Checkout para llevar (`takeaway`) | ✅ **COMPLETA** | CheckoutForm con pills dine_in/takeaway, validaciones Zod estrictas, deliveryAddress/deliveryReference obligatorios para takeaway, Server Action `createOrder` → RPC `create_order` |
| **F11** | Realtime de disponibilidad | ✅ **COMPLETA** | Publication `supabase_realtime` en `orders`/`order_items`, hook `useAdminOrdersRealtime` con connection status, new orders counter, auto-refresh detail modal |
| **F12** | QA/UX completo del cliente | ✅ **COMPLETA** | Checklist manual end-to-end: flujo carrito → checkout → confirmación (validado tras Phase 1) |
| **F13** | Admin/Staff UX | ✅ **COMPLETA** | Código implementado + **Phase 2 UX aplicada** — `/admin/login`, dashboard SSR, transiciones, toggle `is_available`, realtime, `proxy.ts` |
| **F14** | CRUD completo de carta | ⬜ **PENDIENTE** | Solo lectura desde DB (`getMenuCatalog`). Faltan: create/update/delete categorías, productos, presentaciones, opciones, `price_cents`, `is_available` desde panel admin |
| **F15** | Sistema reutilizable / producto comercial | ⬜ **PENDIENTE** | Multi-tenant, onboarding, configuración por negocio, branding, deploy automatizado |

**Para continuar más tarde:** leer `odd/tasks/supabase-pedidos-mvp.md` (feature doc con checklist por fase y decisiones aprobadas).

### Próximos pasos inmediatos (F14 → F15)

1. **F14 — CRUD carta**: Diseñar Server Actions + UI para crear/editar/eliminar categorías, productos, presentaciones, opciones, precios, disponibilidad.
2. **F15 — Sistema reutilizable**: Multi-tenant, onboarding, branding, deploy automatizado.

---

## Estado de UX Improvements

| Phase | Nombre | Estado | Alcance |
|-------|--------|--------|---------|
| **Phase 1** | Checkout público — campos condicionales por modalidad | ✅ **COMPLETA** | `dine_in` = solo nombre; `takeaway`/Delivery = nombre + teléfono + dirección + referencia opcional; sin mesa ni nota |
| **Phase 2** | Panel Admin — separación visual por modalidad | ✅ **COMPLETA** | Secciones "En el local" / "Delivery", cards escaneables, filtro por estado, modal de detalle adaptado |

### Phase 1 — Checkout Público (2026-09-25)

**Objetivo:** Hacer que el checkout solicite únicamente los datos necesarios según la modalidad.

| Modalidad | UI pública | Campos requeridos | Campos NO solicitados |
|-----------|------------|-------------------|----------------------|
| **En el local** (`dine_in`) | "En el local" | Nombre | Teléfono, mesa, dirección, referencia, nota |
| **Delivery** (`takeaway`) | "Delivery" | Nombre, teléfono, dirección | Mesa, nota (referencia opcional) |

**Cambios clave:**
- `CheckoutForm.tsx`: labels "En el local" / "Delivery", campos condicionales, sin `tableLabel` ni `note` en payload
- `CartDrawer.tsx`: envía `tableLabel: null` siempre para `dine_in`
- `checkout-schema.ts`: Zod condicional — `dine_in` rechaza phone/table/delivery; `takeaway` requiere phone+address
- `create-order.ts`: `toRpcLines` fuerza `note: null` (servidor no confía en cliente)
- Tests actualizados: 33/33 PASS

### Phase 2 — Panel Admin (2026-09-25)

**Objetivo:** Reorganizar el panel para distinguir inmediatamente pedidos "En el local" vs "Delivery".

**Cambios clave:**
- `AdminOrdersList.tsx`: tabla → dos secciones con cards ("En el local" 👤 / "Delivery" 📦), contador por sección, estados vacíos contextuales
- Filtro por estado (dropdown): Todos / Pendiente / Preparando / Listo / Entregado / Cancelado
- `AdminOrderDetailModal.tsx`: labels consistentes, `dine_in` sin mesa, `takeaway` con dirección/referencia prominentes (iconos MapPin, Truck)
- Responsive: cards en móvil, densidad en desktop
- Realtime intacto: nuevos pedidos aparecen en su sección correcta automáticamente

---

## Bug Fixes

### Bug 1 — `Invalid checkout input` (2026-09-25)

**Causa:** `checkoutLineSchema` en modo `.strict()` rechazaba el campo `note` que el carrito siempre envía (`CartLine` incluye `note: string`).

**Fix:** `checkout-schema.ts` — agregado `note: z.string().max(MAX_NOTE_LENGTH).optional()` a `checkoutLineSchema`. Servidor sigue ignorándolo (`toRpcLines` fuerza `note: null`).

**Archivos:** `src/lib/orders/checkout-schema.ts`, `scripts/checkout-logic.check.mjs` (test actualizado)

### Bug 2 — `table_label required for dine_in` (2026-09-25)

**Causa:** Dos validaciones en BD exigían `table_label` para `dine_in`:
1. CHECK constraint `orders_table_label_by_mode` (migración inicial)
2. RPC `create_order` (validación explícita con `RAISE EXCEPTION`)

**Fix:** Migración **`20260925000002_allow_null_table_label_for_dine_in.sql`** (no modifica migraciones históricas):
- CHECK constraint relajado: `dine_in` permite `NULL` (valida ≤40 chars si se provee), `takeaway` exige `NULL`
- RPC `create_order` recreada: `dine_in` acepta `table_label` opcional, `takeaway` exige `NULL`

**Archivos:** `supabase/migrations/20260925000002_allow_null_table_label_for_dine_in.sql` (aplicada en PROD)

---

## Qué ya está implementado (código en repo, tests en verde)

### Cliente (F9, F10, Phase 1)
- `src/components/cart/` — CartProvider, CartDrawer, CartButton, CheckoutForm, ProductAddControl
- `src/components/CatalogProvider.tsx` — Índice serializable para resolver nombres/disponibilidad en cliente
- `src/lib/cart-logic.ts` / `cart-store.ts` / `catalog-index.ts` — Lógica pura + persistencia + snapshot SSR
- `src/lib/orders/checkout-schema.ts` — Zod estricto condicional por modalidad (rechaza total/ids inyectados, qty 1–20 finito)
- `src/lib/orders/checkout-core.ts` — Consolidación, validación contra catálogo, total en centavos con overflow guard
- `src/lib/actions/create-order.ts` — Server Action `"use server"` → RPC `create_order` vía cliente anon SSR

### Admin (F11, F13, Phase 2)
- `src/app/admin/login/page.tsx` + `LoginForm.tsx` — Supabase Auth email/password
- `src/app/admin/page.tsx` — Dashboard SSR con `getClaims()` + `is_staff()` RPC
- `src/app/admin/LogoutButton.tsx` — Sign out + redirect
- `src/lib/actions/admin.ts` — 5 Server Actions: `listAdminOrders`, `getAdminOrderDetail`, `updateOrderStatus`, `toggleProductAvailability`, `listAdminProducts`
- `src/components/admin/` — AdminDashboardContent, AdminOrdersList (secciones + filtro), AdminOrderDetailModal, AdminProductsList, Toast, useAdminOrdersRealtime
- `src/proxy.ts` — Session refresh Next 16 (NO middleware), `exchangeCodeForSession` + `getUser()`

### Base de datos / Seguridad (F9–F13)
- RLS deny-by-default en todas las tablas (ver migraciones)
- `is_staff()` RPC (SECURITY DEFINER, `search_path=''`) + tabla `staff_users`
- Column-limited grants: staff solo UPDATE `orders(status, updated_at)` y `products(is_available, updated_at)`
- DB trigger `enforce_valid_order_transition()` — `pending→preparing→ready` enforceado en BD
- `server-only` en `service-role.ts` — build fail si componente cliente lo importa

### Tests (todos PASS)
```bash
node --experimental-strip-types scripts/cart-logic.check.mjs      # 20 checks
node --experimental-strip-types scripts/checkout-logic.check.mjs  # 33 checks
node --experimental-strip-types scripts/order-rpc.check.mjs       # 9 checks LIVE
node --experimental-strip-types scripts/adversarial-admin.check.mjs # 38 checks (concurrencia, auth, transiciones, manipulación, seguridad)
```
- `pnpm exec tsc --noEmit` = 0 | `pnpm lint` = 0 | `pnpm build` = OK

---

## Migraciones aplicadas (orden, YA EN PRODUCCIÓN)

| Archivo | Contenido |
|---------|-----------|
| `20260924120000_init_ordering_schema.sql` | 5 tablas (categories, products, orders, order_items, staff_users), enums `order_mode`/`order_status`, RLS, `is_staff()`, `get_order_by_token()`, grants mínimos |
| `20260924120100_seed_catalog_from_menu.sql` | Seed idempotente: 8 categorías / 38 productos desde `menu.ts`; nunca toca `is_available` ni `price_cents` |
| `20260924120200_create_order_rpc.sql` + `20260924120500` + `20260924120501_fix_create_order_rpc_qualified.sql` | RPC `create_order` SECURITY DEFINER (`search_path=''`), revalidación completa, consolidación, snapshots, total en centavos, EXECUTE solo anon+authenticated |
| `20260924120502_fix_overflow_and_line_limit.sql` | Guard de overflow en INTEGER max (2147483647) + límite de 100 líneas (`P0001`) |
| `20260924130000_enable_realtime_orders.sql` | Publication `supabase_realtime` en `orders` + `order_items` |
| `20260924140000_enforce_order_transitions.sql` | Trigger `enforce_valid_order_transition()` BEFORE UPDATE en `orders.status` |
| **`20260925000000_add_delivery_fields.sql`** | **APLICADA EN PROD** — `delivery_address`, `delivery_reference` en `orders` + CHECK constraints por modo |
| **`20260925000001_update_create_order_rpc.sql`** | **APLICADA EN PROD** — RPC `create_order` actualizada con 7 parámetros (incluye delivery fields) |
| **`20260925000002_allow_null_table_label_for_dine_in.sql`** | **APLICADA EN PROD** — CHECK constraint + RPC relajados: `dine_in` permite `table_label=NULL`, `takeaway` exige `NULL` |

> Regla: una vez pusheada, una migración **no se edita**; los fixes van en una migración numerada nueva.

---

## Estructura del proyecto

```
src/
  app/
    layout.tsx      # Metadata es-AR, fuentes, CartProvider
    page.tsx        # Hero → Experiencia → Carta → Visitar + cart drawer
    globals.css     # Tokens de diseño, motion progresivo, a11y base
    fonts.ts        # next/font/google
    icon.jpg        # Favicon oficial
    admin/
      login/page.tsx           # Login page (Server Component)
      login/LoginForm.tsx      # Client form → signInWithPassword
      page.tsx                 # Dashboard SSR (getClaims + is_staff)
      LogoutButton.tsx         # Client logout
  components/       # Header, Hero, Experiencia, Carta, MenuNav, Visitar, Footer, ui, icons, Reveal
  components/cart/  # CartProvider, CartButton, CartDrawer, CheckoutForm, ProductAddControl
  components/admin/ # AdminDashboardContent, AdminOrdersList, AdminOrderDetailModal, AdminProductsList, Toast, useAdminOrdersRealtime
  lib/
    menu.ts              # Data tipada del menú (fuente del seed; runtime NO la importa como valor)
    catalog.ts           # Server-only: lee catálogo desde Supabase (2 queries, mapea al contrato de menu.ts)
    business.ts          # Datos de contacto verificados + pendientes internos
    cart-logic.ts        # Lógica pura del carrito (merge por productId+presentation+option, clamps)
    cart-store.ts        # Persistencia localStorage versionada + snapshot SSR estable
    catalog-index.ts     # Índice serializable para resolver nombres/disponibilidad en cliente
    orders/
      checkout-schema.ts # Zod estricto condicional por modalidad
      checkout-core.ts   # Consolidación, validación contra catálogo, total en centavos con guard
    actions/
      create-order.ts    # Server Action "use server" → RPC anon (nunca service-role)
      admin.ts           # 5 Server Actions admin (requireStaff + Zod + optimistic locking)
    supabase/
      client.ts          # Cliente browser (publishable key)
      server.ts          # Cliente SSR (publishable key + cookies)
      service-role.ts    # Cliente privilegiado; import "server-only"
supabase/
  migrations/            # Esquema + seed + RPC + delivery fields + realtime + triggers + fixes (ver arriba)
scripts/                 # Tests de Node (sin runner; decisión del usuario)
odd/tasks/               # Feature docs y progreso por fase
```

---

## Desarrollo

```bash
pnpm install
Copy-Item .env.example .env.local   # completar con las credenciales de Supabase (3 valores)
pnpm dev                            # http://localhost:3000
pnpm build
pnpm exec tsc --noEmit
pnpm lint
pnpm exec supabase db push          # aplicar migraciones nuevas (si las hay)
```

---

## Seguridad (invariantes)

- `server-only` en `service-role.ts` hace fallar el build si cualquier componente cliente lo importa.
- RLS deny-by-default: `anon` lee catálogo y ejecuta `create_order`; **nada** de lectura/escritura directa sobre `orders`/`order_items`/`staff_users` con clave anónima.
- `create_order`: SECURITY DEFINER con `search_path=''`; revalida todo contra la DB (existencia, `is_available`, presentaciones, opciones, bounds), consolida duplicados (merge ≤20), snapshots en `order_items`, total en centavos con política NULL + guard de overflow, límite 100 líneas, transacción única.
- El Server Action usa el cliente **anon SSR**, nunca service-role; los ids y totales vienen de la DB.
- Transiciones de estado validadas en 3 capas: Zod (input), Server Action map (UX), DB trigger (fuente verdad).

---

## Datos verificados (fuente: menú PDF oficial, 2 páginas)

| Dato | Valor mostrado públicamente | Nota |
|------|----------------------------|------|
| Categorías | 8 (Pizzas, Sandwiches, Vizcacheras, Licuados, Cafetería, Bebidas, Cervezas, Tragos) | tal como el PDF |
| Productos | 38 | ninguno inventado |
| Precios | no se muestran | el PDF no tiene precios |
| Horarios / delivery / reservas | no se muestran | el PDF no los indica |
| Teléfono | `2622 373836`, CTA **Llamar** (`tel:+542622373836`) | **no** es afirmado como WhatsApp |
| Instagram | `@elcolorado.2024` → `instagram.com/elcolorado.2024` | perfil oficial |
| Dirección pública | `La Consulta · San Carlos · Mendoza` | etiqueta neutral hasta confirmar calle/número |

---

## Ortografía

- Se corrigen errores ortográficos evidentes de presentación que no cambian el producto: `jamon` → `jamón` (4 productos).
- Se mantienen nombres comerciales hasta confirmación: **`Mozarella`** queda `Mozarella` (no se "corrige" a Mozzarella).

---

## Pendientes de confirmación con el negocio

1. **Dirección exacta**: brief dice `San Martín 234, San Carlos`; el PDF dice `San Martin Norte 234, La Consulta`. Es **un único registro pendiente**, nunca dos sedes. La UI pública muestra solo la etiqueta neutral. Al confirmarse: actualizar `address` en `business.ts` y la tabla de arriba.
2. **¿Es WhatsApp?** El `2622 373836` solo puede pasar a CTA de WhatsApp cuando el negocio lo confirme (`phone.whatsappConfirmed` en `business.ts`).
3. **Cafetería — tamaños Chico/Mediano/Grande**: alcance ambiguo en el PDF; guardado en `pendingNotes`, no renderizado.
4. **Cervezas — "Latas"**: figura en el PDF pero puede ser presentación y no producto independiente. En `pendingNotes`, no renderizado.
5. **Logo/favicon oficiales**: resuelto — `public/elcolorado_logo.jpg` se usa como logo del header y como favicon (`src/app/icon.jpg`).
6. **Fotos reales**: fase pendiente; la galería no existe en la UI pública hasta entonces.
7. **URL de Google Maps**: no hay link de mapa sin URL verificada.

---

## Changelog reciente

### Phase 2 — Admin UX Improvement (2026-09-25)

**Objetivo:** Separar visualmente pedidos "En el local" y "Delivery" en el panel admin.

**Cambios:**
- `AdminOrdersList.tsx`: reescrito — tabla → dos secciones con cards, badges "En el local" 👤 / "Delivery" 📦, filtro por estado, estados vacíos por sección
- `AdminOrderDetailModal.tsx`: labels consistentes, `dine_in` sin mesa, `takeaway` con dirección/referencia prominentes
- Tests: 38/38 adversarial, 9/9 RPC live, 33/33 checkout, 20/20 cart

### Phase 1 — Checkout UX Improvement (2026-09-25)

**Objetivo:** Checkout condicional por modalidad (`dine_in` = solo nombre; `takeaway` = nombre + teléfono + dirección).

**Cambios:**
- `CheckoutForm.tsx`: labels "En el local" / "Delivery", campos dinámicos, sin mesa ni nota
- `checkout-schema.ts`: Zod condicional estricto por modalidad
- `create-order.ts`: `note: null` forzado server-side
- Bug 1 fix: `note` aceptado en schema (ignorado server-side)
- Bug 2 fix: migración `20260925000002` permite `table_label=NULL` para `dine_in`
- Tests: 33/33 checkout, 9/9 RPC live, 38/38 adversarial

### F10 — Checkout `takeaway` fix (2026-09-24)

**Problema:** Al confirmar un pedido en modo `takeaway`, el checkout fallaba con `"Invalid checkout input"` porque el payload enviado desde `CartDrawer.tsx` no incluía `deliveryAddress` ni `deliveryReference`.

**Fix aplicado** (`src/components/cart/CartDrawer.tsx`, función `handleSubmitCheckout`): agregados `deliveryAddress` y `deliveryReference` al payload.

**Verificaciones:** ✅ tsc 0 | ✅ lint 0 | ✅ build OK | ✅ cart-logic 20/20 | ✅ checkout-logic 29/29 | ✅ adversarial-admin 38/38

**Nota:** Las migraciones de delivery (`20260925000000_add_delivery_fields.sql` y `20260925000001_update_create_order_rpc.sql`) **YA ESTÁN APLICADAS EN PRODUCCIÓN** (confirmado 2026-09-25).

---

### F11/F13 — Descubrimiento: Admin panel + Realtime ya implementados (2026-09-25)

**Hallazgo:** La inspección completa del repositorio revela que **todo el core de Admin (F13) y Realtime (F11) ya está implementado y testeado** desde sesiones previas, pero la documentación no se actualizó.

**Qué ya existe (código + tests):**
- `/admin/login` + `LoginForm` (Supabase Auth email/password)
- `/admin` dashboard SSR con `getClaims()` + `is_staff()` RPC
- 5 Server Actions en `src/lib/actions/admin.ts`: `listAdminOrders`, `getAdminOrderDetail`, `updateOrderStatus`, `toggleProductAvailability`, `listAdminProducts`
- Dashboard client: `AdminDashboardContent`, `AdminOrdersList`, `AdminOrderDetailModal`, `AdminProductsList`, `Toast`, `useAdminOrdersRealtime`
- Realtime: publication `supabase_realtime` en `orders`/`order_items` + hook con connection status, new orders counter, auto-refresh
- Transiciones `pending→preparing→ready`: Server Action + DB trigger `enforce_valid_order_transition()` (doble validación)
- Toggle `is_available`: Server Action + RLS column-limited grant + `revalidatePath("/")`
- Seguridad: RLS deny-by-default (62+52 checks), `server-only` guard, `search_path=''`, adversarial tests **38/38 PASS**

**Evidencia tests (2026-09-25):**
- `pnpm exec tsc --noEmit` = 0 | `pnpm lint` = 0 | `pnpm build` = OK
- `adversarial-admin.check.mjs` → **38/38 PASS**
- `order-rpc.check.mjs` → **9/9 PASS**
- `checkout-logic.check.mjs` → **33/33 PASS** (actualizado Phase 1)
- `cart-logic.check.mjs` → **20/20 PASS**

---

## Deuda técnica documentada

- Mensajes `P0001` de la RPC pasan crudos al cliente (mapeo a códigos de dominio pendiente; no es vulnerabilidad).
- Página de confirmación `/pedido/[token]` no existe aún (deferred).
- CRUD completo de carta (F14) no iniciado.
- Multi-tenant / producto comercial (F15) no iniciado.
- Rate limiting en creación de pedidos (pendiente).
- Test runner (Vitest) diferido por decisión del usuario.