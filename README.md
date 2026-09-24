# El Colorado Resto Bar — Web

Sitio oficial de **El Colorado Resto Bar** (La Consulta · San Carlos · Mendoza).
Landing one-page con la carta del negocio y datos de contacto, con **pedidos online en curso** (MVP).

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres + RLS) · Zod · `next/font`.

- No hay precios inventados: el menú PDF oficial no incluye precios. `price_cents` queda `NULL` hasta que el negocio los provea; la UI no muestra ni inventa precios.
- No hay fotos falsas: la galería se mostrará cuando existan fotos reales del negocio.
- Los pedidos se crean con **RLS deny-by-default**: el cliente nunca controla precios, totales, disponibilidad, `order_number` ni `public_token`.

## Estado del MVP (2026-09-24)

Fases del plan aprobado por el usuario; detalle de tareas y evidencia en `odd/tasks/supabase-pedidos-mvp.md`.

| Fase | Estado |
| --- | --- |
| **P0** Setup Supabase (deps, client factories, env) | ✅ |
| **P1** DB + seguridad base (5 tablas, RLS, seed, 114 checks de seguridad) | ✅ |
| **P2** Carta desde DB (`getMenuCatalog`, disponibilidad real) | ✅ |
| **P3** Carrito + checkout cliente (localStorage, drawer) | ✅ |
| **P4** Creación segura de pedidos (Server Action + RPC, con correcciones de auditoría) | ✅ |
| **P5** Admin (`/admin/login` + panel) | ⬜ **siguiente** |
| **P6** Realtime + UX (notificaciones de pedidos nuevos) | ⬜ |
| **P7** Hardening (RLS audit, rate limiting) | ⬜ |
| **P8** Testing/QA (runner + QA manual) | ⬜ |

**Para continuar más tarde:** leer `odd/tasks/supabase-pedidos-mvp.md` (feature doc con el checklist por fase y decisiones aprobadas). La próxima fase es **P5 — Admin**: `login` + panel con `getClaims()`, transiciones de estado (`pending → preparing → ready`), toggle `is_available`. Nota Next 16: el refresh de sesión usa `proxy.ts` (NO `middleware.ts`).

## Estructura

```
src/
  app/
    layout.tsx      # Metadata es-AR, fuentes, CartProvider
    page.tsx        # Hero → Experiencia → Carta → Visitar + cart drawer
    globals.css     # Tokens de diseño, motion progresivo, a11y base
    fonts.ts        # next/font/google
    icon.jpg        # Favicon oficial
  components/       # Header, Hero, Experiencia, Carta, MenuNav, Visitar, Footer, ui, icons, Reveal
  components/cart/  # CartProvider, CartButton, CartDrawer, CheckoutForm, ProductAddControl
  lib/
    menu.ts         # Data tipada del menú (fuente del seed; runtime NO la importa como valor)
    catalog.ts      # Server-only: lee catálogo desde Supabase (2 queries, mapea al contrato de menu.ts)
    business.ts     # Datos de contacto verificados + pendientes internos
    cart-logic.ts   # Lógica pura del carrito (merge por productId+presentation+option, clamps)
    cart-store.ts   # Persistencia localStorage versionada + snapshot SSR estable
    catalog-index.ts# Índice serializable para resolver nombres/disponibilidad en cliente
    orders/
      checkout-schema.ts  # Zod estricto del checkout (rechaza total/ids inyectados; qty 1-20 finito)
      checkout-core.ts    # Consolidación, validación contra catálogo, total en centavos con guard
    actions/create-order.ts  # Server Action "use server" → RPC anon (nunca service-role)
    supabase/
      client.ts       # Cliente browser (publishable key)
      server.ts       # Cliente SSR (publishable key + cookies)
      service-role.ts # Cliente privilegiado; import "server-only" (build-fail si entra al cliente)
supabase/
  migrations/         # Esquema + seed + RPC, aplicadas en orden (ver abajo)
scripts/              # Tests de Node (sin runner; decisión del usuario, ver "Tests")
odd/tasks/            # Feature docs y progreso por fase
```

## Migraciones aplicadas (orden)

| Archivo | Contenido |
| --- | --- |
| `20260924120000_init_ordering_schema.sql` | 5 tablas (categories, products, orders, order_items, staff_users), enums `order_mode`/`order_status`, RLS, `is_staff()`, `get_order_by_token()`, grants mínimos |
| `20260924120100_seed_catalog_from_menu.sql` | Seed idempotente: 8 categorías / 38 productos desde `menu.ts`; nunca toca `is_available` ni `price_cents` |
| `20260924120200_create_order_rpc.sql` + `20260924120500` + `20260924120501_fix_create_order_rpc_qualified.sql` | RPC `create_order` SECURITY DEFINER (`search_path=''`), revalidación completa, consolidación, snapshots, total en centavos, EXECUTE solo anon+authenticated |
| `20260924120502_fix_overflow_and_line_limit.sql` | Corrección auditoría: guard de overflow en INTEGER max (2147483647) + límite de 100 líneas (`P0001`) |

Regla: una vez pusheada, una migración **no se edita**; los fixes van en una migración numerada nueva.

## Tests

Sin runner configurado (Vitest diferido por decisión del usuario, decisión 10): los tests son scripts de Node con type-stripping.

```bash
node --experimental-strip-types scripts/cart-logic.check.mjs      # ~20 checks  — lógica pura del carrito
node --experimental-strip-types scripts/checkout-logic.check.mjs  # ~29 checks  — zod + merge + total/overflow
node --experimental-strip-types scripts/order-rpc.check.mjs       # ~9 checks LIVE contra cloud (requiere .env.local)
```

- Estado actual: **todos en verde** (PASS / 0 FAIL), junto con `tsc` 0, `lint` 0 problems, `build` OK.
- Los tests live usan service-role **solo para limpiar** las órdenes de prueba por `public_token`; nunca lo importan desde la app (`server-only`).
- Gap documentado: caso `price_cents` no-null y producto no disponible no son testeables por API (no hay write path de staff) → cubiertos en capa pura.

## Desarrollo

```bash
pnpm install
Copy-Item .env.example .env.local   # completar con las credenciales de Supabase (3 valores)
pnpm dev                            # http://localhost:3000
pnpm build
pnpm exec tsc --noEmit
pnpm lint
pnpm exec supabase db push          # aplicar migraciones nuevas
```

## Seguridad (invariantes)

- `server-only` en `service-role.ts` hace fallar el build si cualquier componente cliente lo importa.
- RLS deny-by-default: `anon` lee catálogo y ejecuta `create_order`; **nada** de lectura/escritura directa sobre `orders`/`order_items`/`staff_users` con clave anónima.
- `create_order`: SECURITY DEFINER con `search_path=''`; revalida todo contra la DB (existencia, `is_available`, presentaciones, opciones, bounds), consolida duplicados (merge ≤20), snapshots en `order_items`, total en centavos con política NULL + guard de overflow, límite 100 líneas, transacción única.
- El Server Action usa el cliente **anon SSR**, nunca service-role; los ids y totales vienen de la DB.

## Datos verificados (fuente: menú PDF oficial, 2 páginas)

| Dato | Valor mostrado públicamente | Nota |
| --- | --- | --- |
| Categorías | 8 (Pizzas, Sandwiches, Vizcacheras, Licuados, Cafetería, Bebidas, Cervezas, Tragos) | tal como el PDF |
| Productos | 38 | ninguno inventado |
| Precios | no se muestran | el PDF no tiene precios |
| Horarios / delivery / reservas | no se muestran | el PDF no los indica |
| Teléfono | `2622 373836`, CTA **Llamar** (`tel:+542622373836`) | **no** es afirmado como WhatsApp |
| Instagram | `@elcolorado.2024` → `instagram.com/elcolorado.2024` | perfil oficial |
| Dirección pública | `La Consulta · San Carlos · Mendoza` | etiqueta neutral hasta confirmar calle/número |

## Ortografía

- Se corrigen errores ortográficos evidentes de presentación que no cambian el
  producto: `jamon` → `jamón` (4 productos).
- Se mantienen nombres comerciales hasta confirmación: **`Mozarella`** queda
  `Mozarella` (no se "corrige" a Mozzarella).

## Pendientes de confirmación con el negocio

1. **Dirección exacta**: brief dice `San Martín 234, San Carlos`; el PDF dice
   `San Martin Norte 234, La Consulta`. Es **un único registro pendiente**, nunca
   dos sedes, y no se resuelve por suposición. La UI pública muestra solo la
   etiqueta neutral. Al confirmarse: actualizar `address` en `business.ts` y la
   tabla de arriba.
2. **¿Es WhatsApp?** El `2622 373836` solo puede pasar a CTA de WhatsApp cuando
   el negocio lo confirme (`phone.whatsappConfirmed` en `business.ts`).
3. **Cafetería — tamaños Chico/Mediano/Grande**: alcance ambiguo en el PDF;
   guardado en `pendingNotes`, no renderizado.
4. **Cervezas — "Latas"**: figura en el PDF pero puede ser presentación y no
   producto independiente. En `pendingNotes`, no renderizado.
5. **Logo/favicon oficiales**: resuelto — `public/elcolorado_logo.jpg` se usa
   como logo del header y como favicon (`src/app/icon.jpg`).
6. **Fotos reales**: fase pendiente; la galería no existe en la UI pública hasta
   entonces.
7. **URL de Google Maps**: no hay link de mapa sin URL verificada.

## Pendientes de desarrollo

- **P5 — Admin**: `/admin/login` + `/admin` (auth `getClaims()`, transiciones de estado, toggle `is_available`). Usar `proxy.ts` en Next 16.
- **P6 — Realtime**: suscripción a `orders` (INSERT/UPDATE), contador visual + sonido opcional.
- **P7 — Hardening**: rate limiting en creación de pedidos, RLS audit.
- **P8 — QA**: runner de tests (decisión pendiente vs Vitest) + checklist manual.
- Deuda documentada: mensajes `P0001` de la RPC pasan crudos al cliente (mapeo a códigos de dominio pendiente; no es vulnerabilidad).