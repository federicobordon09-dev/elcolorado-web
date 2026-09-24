# Guía de Deploy a Producción — El Colorado Resto Bar

> **Estado**: Preparado para P8.1 — No desplegar aún.
> **Última actualización**: 2026-09-24

---

## 1. Variables de entorno requeridas

Copiar `.env.example` a `.env.local` y completar **exactamente** estos 3 valores:

| Variable | Descripción | Origen | Requerida |
|----------|-------------|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej. `https://xyz.supabase.co`) | Dashboard Supabase → Settings → API | ✅ Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon) de Supabase | Dashboard Supabase → Settings → API | ✅ Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta service-role (nunca expuesta al cliente) | Dashboard Supabase → Settings → API → Service Role | ✅ Sí |

**Notas críticas**:
- `.env.local` **nunca** se commitea (está en `.gitignore`).
- `.env.example` es el template público — mantener vacío y versionado.
- La `service_role` **solo** se usa en scripts de test (`order-rpc.check.mjs` para cleanup) y **nunca** en código de la app (`src/lib/supabase/service-role.ts` está protegido con `server-only`).

---

## 2. Estado de las migraciones

Orden exacto de aplicación (ejecutar con `supabase db push` o `supabase migration up`):

| Orden | Archivo | Descripción |
|-------|---------|-------------|
| 1 | `20260924120000_init_ordering_schema.sql` | Esquema base: 5 tablas (categories, products, orders, order_items, staff_users), enums, RLS, grants, `is_staff()`, `get_order_by_token()`, triggers `updated_at` |
| 2 | `20260924120100_seed_catalog_from_menu.sql` | Seed idempotente: 8 categorías / 38 productos desde `menu.ts`. **No toca** `is_available` (default true) ni `price_cents` (NULL). |
| 3 | `20260924120200_create_order_rpc.sql` | RPC `create_order` v1 (SECURITY DEFINER, `search_path=''`) |
| 4 | `20260924120500_fix_create_order_rpc.sql` | Fix: calificación de columnas en INSERT RETURNING |
| 5 | `20260924120501_fix_create_order_rpc_qualified.sql` | Fix: sentinela `''` para NULL en PK temporal, merge duplicados ≤20, validación completa |
| 6 | `20260924120502_fix_overflow_and_line_limit.sql` | Fix: overflow guard INTEGER max (2147483647) + límite 100 líneas (`P0001`) |
| 7 | `20260924130000_enable_realtime_orders.sql` | Realtime: `alter publication supabase_realtime add table orders, order_items` |
| 8 | `20260924140000_enforce_order_transitions.sql` | Trigger `BEFORE UPDATE OF STATUS` con función `SECURITY DEFINER` que valida transiciones válidas (`pending→preparing`, `preparing→ready`), rechaza otras con `P0001` |

**Reglas de migración**:
- Una vez pusheada, **nunca se edita** una migración existente.
- Fixes van en migración nueva con timestamp incremental.
- `supabase db push` aplica en orden; `supabase migration list` verifica estado.

---

## 3. Configuración Supabase (Dashboard)

### Realtime
- Habilitado en `supabase/config.toml` (`realtime.enabled = true`).
- Tablas en publication: `orders`, `order_items`.
- RLS respeta realtime: solo staff autenticado recibe eventos.

### Auth
- **Proveedores**: Email/Password (staff manual, sin signup público).
- **Staff creation**: Manual via Dashboard → Authentication → Users → "Add user" → Auto-confirm ON → insertar `user_id` en `public.staff_users`.

### RLS / Grants (ya en migración base)
- `anon`: SELECT en `categories`, `products`; EXECUTE en `create_order`, `get_order_by_token`, `is_staff` (denegado por grant).
- `authenticated` (staff verificado vía `is_staff()`): SELECT/UPDATE (`status`, `updated_at`) en `orders`; SELECT en `order_items`; UPDATE (`is_available`, `updated_at`) en `products`.
- `service_role`: INSERT/SELECT/UPDATE/DELETE en `orders`, `order_items` (solo para crear órdenes via Server Action).
- `staff_users`: **sin policies** (owner/SQL only); membresía probada vía `is_staff()`.

### Storage / Buckets
- No usado en MVP. Deshabilitado o sin configurar.

---

## 4. Configuración Vercel

### Build
```bash
pnpm install --frozen-lockfile
pnpm build
```

### Variables de entorno en Vercel
Agregar en **Project Settings → Environment Variables** (Production, Preview, Development):

| Nombre | Valor | Environment |
|--------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJ...` | All |

**Importante**: En Vercel, las variables con prefijo `NEXT_PUBLIC_` se inyectan en el bundle cliente. `SUPABASE_SERVICE_ROLE_KEY` **NO** tiene ese prefijo y **solo** está disponible en Server Components / Actions (build-time y runtime server).

### Configuración Next.js
- `next.config.ts`: mínimo (solo `NextConfig` vacío).
- `src/app/layout.tsx`: `metadataBase: "https://elcolorado.vercel.app"` → **actualizar al dominio final** antes de deploy.
- `next/font/google`: Geist, Bebas Neue, Caveat (auto-optimizadas, self-hosted en build).

### Imágenes / Assets
- `public/elcolorado_logo.jpg`: logo + favicon.
- `public/og-image.png`: 1200×630 para Open Graph.
- No hay imágenes externas; todas servidas desde `/public` o Supabase Storage (no usado aún).

---

## 5. Pasos para crear/verificar el primer Staff

1. En Supabase Dashboard → Authentication → Users → "Add user":
   - Email: email del dueño/encargado.
   - Password: segura (generar y compartir por canal seguro).
   - **Auto-confirm**: ON (no requiere email confirmation).
   - Role: `authenticated` (default).
2. Copiar el `user_id` (UUID) generado.
3. En SQL Editor o Table Editor → `public.staff_users`:
   ```sql
   insert into public.staff_users (user_id) values ('<user_id>');
   ```
4. Verificar en la app:
   - Ir a `/admin/login` → login con email/password.
   - Redirige a `/admin` → panel visible (pedidos + disponibilidad).

---

## 6. Smoke tests post-deploy

Ejecutar **después** del deploy en Vercel (contra producción):

### 6.1 Sitio público
- [ ] `/` carga sin errores (200).
- [ ] Hero, Experiencia, Carta, Visitar renderizan.
- [ ] Carta muestra 8 categorías, 38 productos, `is_available=true` solo.
- [ ] Carrito: agregar productos, presentaciones, opciones, notas.
- [ ] Checkout: dine_in/takeaway, validaciones (nombre, mesa, teléfono opcional).
- [ ] Envío de pedido: success panel con `order_number` + `public_token`.
- [ ] `/pedido/[token]` (si implementado) muestra confirmación.

### 6.2 Admin
- [ ] `/admin/login` accesible.
- [ ] Login staff exitoso → redirige a `/admin`.
- [ ] No-staff no puede acceder (redirect a login).
- [ ] Lista de pedidos: #, hora, modo, cliente, items, total, estado, acciones.
- [ ] Transiciones: `pending` → "Preparar" → `preparing` → "Listo" → `ready`.
- [ ] Detalle modal: snapshots correctos (nombre, presentación, opción, qty, nota, precio unitario).
- [ ] Disponibilidad: toggle por producto → actualiza UI y catálogo público.
- [ ] Logout funciona → redirige a `/admin/login`.

### 6.3 Realtime (manual)
- [ ] Abrir `/admin` en dos pestañas/equipos.
- [ ] Crear pedido desde sitio público.
- [ ] Verificar aparición automática en lista admin (sin refresh).
- [ ] Cambiar estado en una pestaña → reflejado en la otra.

### 6.4 Tests automatizados
```bash
pnpm exec tsc --noEmit        # 0 errors
pnpm exec eslint .            # 0 errors (warnings OK en test scripts)
pnpm build                    # OK
node --experimental-strip-types scripts/cart-logic.check.mjs      # 20 PASS
node --experimental-strip-types scripts/checkout-logic.check.mjs  # 29 PASS
node --experimental-strip-types scripts/order-rpc.check.mjs       # 9 PASS
node --experimental-strip-types scripts/adversarial-admin.check.mjs # 38 PASS
```

---

## 6. Problemas conocidos / Deuda técnica (no bloqueantes)

| ID | Descripción | Impacto | Prioridad |
|----|-------------|---------|-----------|
| M1 | Rate limiting en `create_order` | Medio — sin identidad confiable para anon | P8+ |
| M2 | Audit logs admin | Medio — sin trazabilidad de acciones staff | P8+ |
| M3 | Realtime: eventos perdidos en reconexión | Bajo — mitigado por `markOrdersAsSeen` + refetch | P8+ |
| M4 | Test E2E automatizado | Bajo — requiere infra Playwright/Cypress | P8+ |
| M5 | `service_role` en `.env.local` de desarrollo | Bajo — rotar antes de prod | Pre-deploy |

---

## 7. Pasos manuales restantes antes de P8.2

| Paso | Descripción | Responsable |
|------|-------------|-------------|
| 1 | **Rotar `SUPABASE_SERVICE_ROLE_KEY`** — la actual está en `.env.local` de desarrollo. Generar nueva en Supabase Dashboard y usar esa en Vercel. | DevOps |
| 2 | **Actualizar `metadataBase`** en `src/app/layout.tsx` al dominio final (ej. `https://elcolorado.com.ar` o `https://elcolorado.vercel.app`). | Dev |
| 3 | **Confirmar dirección exacta** con el negocio → actualizar `src/lib/business.ts` y `README.md`. | Negocio |
| 4 | **Confirmar WhatsApp** — si el teléfono es WhatsApp, set `whatsappConfirmed: true` en `business.ts`. | Negocio |
| 5 | **Crear proyecto Supabase de producción** (separado del de desarrollo) y aplicar migraciones 1–8. | DevOps |
| 6 | **Configurar proyecto Vercel** vinculado al repo, variables de entorno de producción. | DevOps |
| 7 | **Crear staff inicial** en Supabase Auth + `staff_users` (ver sección 5). | DevOps |
| 8 | **Ejecutar smoke tests** (sección 6) contra producción. | QA / Dev |
| 9 | **Rotar claves** si alguna se expuso durante desarrollo. | DevOps |

---

## 8. Referencias rápidas

- **Repositorio**: `elcolorado-web` (Next.js 16, App Router, React 19, TypeScript, Tailwind 4).
- **Rama deploy**: `main` (push a main → Vercel auto-deploy).
- **Supabase CLI**: `supabase db push` (migraciones), `supabase db diff` (ver cambios).
- **Tests**: `pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm build && node --experimental-strip-types scripts/*.check.mjs`.

---

> **Firma**: Auditoría P7.3 completada — 0 CRÍTICOS, 0 ALTOS, 5 MEDIOS/BAJOS documentados.
> **Listo para P8.2** tras pasos manuales arriba.