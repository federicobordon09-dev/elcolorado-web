# F15.4 — Investigación y corrección del realtime de pedidos

## Objetivo
Corregir el bug: los nuevos pedidos no aparecen automáticamente en `/admin` sin F5.

## Diagnóstico (FASE 1 - Frontend)

**Causa raíz en `useAdminOrdersRealtime.ts`:**

El `useEffect` (línea 104-190 original) tenía en su **dependency array**: `[orders, setOrders, selectedOrderId, setOrderDetail, isOrderDetailOpen, mapRealtimeOrder, markOrdersAsSeen]`.

**Problema:** `orders` cambia cada vez que llega un evento realtime (INSERT/UPDATE/DELETE). Esto hacía que el effect se re-ejecutara, creando una **nueva suscripción** y limpiando la anterior. Durante la transición:
- Se perdían eventos (race condition)
- La suscripción antigua no se limpiaba a tiempo
- El nuevo canal tardaba en alcanzar estado `SUBSCRIBED`
- `items_count` hardcodeado a 0 en `mapRealtimeOrder`

**Otros problemas:**
- `selectedOrderId`, `setOrderDetail`, `isOrderDetailOpen` cambian frecuentemente → más re-suscripciones
- Falta manejo de estado `SUBSCRIBING`
- El callback `on` era `async` pero supabase no lo await

## Verificación Supabase (FASE 2)

| Verificación | Resultado |
|---|---|
| Tabla `orders` existe | ✅ Sí (137 filas) |
| RLS habilitado | ✅ Sí |
| Políticas SELECT/UPDATE para staff | ✅ `is_staff()` |
| Publicación `supabase_realtime` existe | ✅ Sí |
| `orders` en `supabase_realtime` | ✅ Sí |
| `order_items` en `supabase_realtime` | ✅ Sí |
| `is_staff()` function | ✅ Existe, revisa `staff_users` |

**Conclusión FASE 2:** Configuración Supabase **correcta**. El problema era frontend.

## FASE 3 - Punto exacto de rotura

1. Usuario crea pedido → INSERT en `orders` ✅
2. PostgreSQL publica en `supabase_realtime` ✅
3. Canal del navegador *debería* recibir INSERT ❌ **El hook se re-suscribe por cada cambio en `orders` → eventos perdidos durante la transición**

## Corrección aplicada (FASE 4)

**Archivo:** `src/components/admin/useAdminOrdersRealtime.ts`

Cambios clave:
1. **Effect principal con `[]` deps** - se ejecuta solo una vez al montar
2. **Refs para valores mutables** (`ordersRef`, `selectedOrderIdRef`, `isOrderDetailOpenRef`, `setOrderDetailRef`) sincronizados con `useEffect` separados
3. **Manejo correcto de estados de suscripción**: `SUBSCRIBING` → `connecting`, `SUBSCRIBED` → `connected`, errores → `error`
4. **Cleanup robusto** sin race conditions
5. **Callback no-async** con `void (async () => {...})()` para `getAdminOrderDetail` en UPDATE
6. `items_count: 0` mantenido (el modal carga el detalle completo)

## Archivos modificados
- `src/components/admin/useAdminOrdersRealtime.ts` (único archivo)

## Validación automática
- catalog-crud: 47/47 ✅
- cart-logic: 20/20 ✅
- checkout-logic: 33/33 ✅
- order-rpc: 9/9 ✅
- adversarial-admin: 38/38 ✅
- tsc: 0 errores ✅
- lint: 0 errors (9 warnings preexistentes) ✅
- build: OK, `/` sigue Dynamic (ƒ) ✅

## Validación manual (pendiente de QA real)

1. Abrir `/admin` → panel abierto
2. Abrir carta pública en otra pestaña → crear pedido
3. **Esperar sin F5** → pedido aparece automáticamente
4. Confirma que aparece en tab correcto (En el local / Delivery)
5. Confirma contador de tab se actualiza
6. Cambia estado del pedido → refleja correctamente
7. Crea otro pedido → sin duplicados
8. Cambia entre tabs → suscripción sigue funcionando

## Confirmaciones
- ✅ NO polling / NO refetch periódico / NO F5 automático
- ✅ NO migración creada
- ✅ NO commit / NO push
- ✅ Seguridad: solo anon key, RLS intacta, service-role no usado
- ✅ Compatible con F15.3 (tabs, filtros, expandibles, contadores)