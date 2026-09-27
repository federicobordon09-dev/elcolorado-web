# F15.6 — Sincronización automática de la carta pública vía Realtime

## Objetivo
La carta pública (`/`) debe reflejar automáticamente mutaciones admin del catálogo (crear/editar/desactivar/activar productos y categorías) sin F5.

## Causa raíz
La página `/` se renderiza en servidor con `force-dynamic`. `getMenuCatalog()` lee de Supabase en cada request SSR. Las Server Actions admin llaman `revalidatePath("/")` tras mutaciones, pero **eso solo afecta al siguiente request** (nuevo SSR). Una página ya abierta en el navegador **no recibe notificación** de los cambios.

**Además**: las tablas `categories` y `products` **no están publicadas** en `supabase_realtime` (verificación MCP: `pg_publication_tables` vacío para estas tablas). Sin publicación, Supabase no emite eventos Realtime para INSERT/UPDATE/DELETE en estas tablas.

## Solución elegida
1. **Migración SQL**: agregar `categories` y `products` a la publicación `supabase_realtime`.
2. **Hook cliente `useCatalogRealtime`**: suscripción a `postgres_changes` en `categories` y `products`. Al recibir cualquier evento (INSERT/UPDATE/DELETE), llama `router.refresh()` con debounce de 150ms para obtener el catálogo actualizado via SSR (reusa `force-dynamic` + `revalidatePath`).
3. **Integración en `page.tsx`**: montar `CatalogRealtimeSync` (wrapper del hook) dentro del `CatalogProvider`.

**Por qué `router.refresh()` y no polling/manual state merge**:
- Reusa la arquitectura SSR existente (`getMenuCatalog`, `CatalogProvider`, `Carta`).
- `router.refresh()` pide al servidor el HTML actualizado (con catálogo fresco) y hace **partial hydration** - no recarga completa, preserva estado cliente (carrito, scroll, etc.).
- Coherente con `force-dynamic` + `revalidatePath("/")` ya implementados en F15.1.
- Simple, robusto, sin duplicar lógica de mapeo catálogo en cliente.

## Arquitectura
```
Admin crea/edita producto
        ↓
Server Action: updateProduct + revalidatePath("/")
        ↓
Supabase: INSERT/UPDATE en products
        ↓
PostgreSQL: publica en supabase_realtime (si tablas están en publicación)
        ↓
Navegador (página / abierta): hook useCatalogRealtime recibe evento
        ↓
router.refresh() → Next.js pide / → SSR ejecuta getMenuCatalog() fresco
        ↓
CatalogProvider recibe nuevo DTO → Carta se re-renderiza
```

## Migración creada (NO aplicada automáticamente)
Archivo: `supabase/migrations/20260927000001_catalog_realtime_sync.sql`

```sql
-- F15.6: Publicar tablas de catálogo en supabase_realtime
-- Permite suscripción Realtime desde la carta pública (/)
-- para sincronización automática sin F5.

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.products;
```

**Para aplicar:** ejecutar este SQL en Supabase SQL Editor.

## Archivos modificados/creados
| Archivo | Tipo | Cambio |
|---|---|---|
| `src/app/page.tsx` | Modificado | Importa y monta `<CatalogRealtimeSync />` dentro de `<CatalogProvider>` |
| `src/components/cart/useCatalogRealtime.ts` | **Nuevo** | Hook de suscripción Realtime a `categories`/`products` con debounce + `router.refresh()` |
| `src/components/cart/CatalogRealtimeSync.tsx` | **Nuevo** | Wrapper cliente que monta el hook (no renderiza UI) |
| `supabase/migrations/20260927000001_catalog_realtime_sync.sql` | **Nuevo** | Migración SQL para publicar tablas en Realtime |

## Validación automática
| Suite | Resultado |
|---|---|
| `catalog-crud.check.mjs` | ✅ 47/47 |
| `cart-logic.check.mjs` | ✅ 20/20 |
| `checkout-logic.check.mjs` | ✅ 33/33 |
| `order-rpc.check.mjs` | ✅ 9/9 |
| `adversarial-admin.check.mjs` | ✅ 38/38 |
| `pnpm exec tsc --noEmit` | ✅ 0 errores |
| `pnpm lint` | ✅ 0 errors (11 warnings preexistentes) |
| `pnpm build` | ✅ OK — `/` sigue **Dynamic (ƒ)** |

## Verificación manual (5 casos)
1. **Crear producto** → aparece automáticamente en `/` (sin F5)
2. **Editar producto** → nombre/precio/presentaciones se actualizan
3. **Desactivar producto** → desaparece de la carta
4. **Activar producto** → vuelve a aparecer
5. **Crear categoría** → aparece automáticamente con sus productos

*Prerrequisito:* aplicar la migración en Supabase SQL Editor antes de probar.

## Confirmaciones
- ✅ NO commit / NO push
- ✅ F15.1 (`force-dynamic`) intacta — `/` sigue Dynamic
- ✅ F15.2 (estados formulario) intacta
- ✅ F15.3 (tabs pedidos) intacta
- ✅ F15.4 (realtime pedidos) intacta
- ✅ F15.5 (toast duplicado) intacta
- ✅ No se tocó checkout, carrito, pedidos, order RPC, realtime de pedidos
- ✅ No se implementó DELETE
- ✅ No se aplicó migración automáticamente
- ✅ Seguridad/RLS mantenida (usa anon key, políticas catalog_*_read existentes)