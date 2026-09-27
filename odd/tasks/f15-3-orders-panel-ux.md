# F15.3 — Optimización UX/UI del panel de pedidos de administración

## Objetivo
Rediseñar la presentación de pedidos del panel admin para lectura rápida, compacta y con jerarquía clara, separando **EN EL LOCAL** y **DELIVERY** sin scroll excesivo.

## Problema
- `AdminOrdersList.tsx` renderiza dos `OrderSection` apiladas (dine_in + takeaway) → página larga.
- Tarjetas altas (~150px): poca densidad, lento de escanear.
- Tipo de pedido sólo como badge chico dentro de la tarjeta.
- `table_label` (mesa) no visible en la lista.
- `handleStatusChange` sin try/finally: botón queda bloqueado si la action falla por red.

## Alcance (constraints del usuario)
- NO nuevas funcionalidades de negocio, NO BD, NO migraciones, NO `supabase db push`.
- NO commit, NO push.
- NO tocar realtime (`useAdminOrdersRealtime`), checkout, carrito, order RPC, `orders`/`order_items`.
- Server Actions de pedidos: no modificar (no fue necesario).
- Bugs ajenos (realtime caído) → documentar, no corregir.

## Diseño elegido
Segmented control (tabs) "EN EL LOCAL | DELIVERY" dentro de la sección Pedidos, con:
- Filas compactas de una línea (nº, hora, cliente, mesa/ítems/total, badge de estado, acción).
- Panel de productos expandible por fila (lazy con `getAdminOrderDetail`, ya existente).
- Filtro de estado existente conservado (select + chip).
- A11y: role=tablist/tab/tabpanel, teclas flechas/Home/End, roving tabindex, aria-expanded.
- Orden existente `created_at desc` (más arriba = más reciente) preservado.

## Tareas
- [x] T1: Inspeccionar código real (AdminOrdersList, AdminDashboardContent, page.tsx, tipos admin.ts)
- [x] T2: Crear este documento + espejo Engram
- [x] T3: Reescribir `AdminOrdersList.tsx` (tabs segmentados + filas compactas + expandibles)
- [x] T4: `handleStatusChange` con try/finally en `AdminDashboardContent.tsx` (botones no se traban)
- [x] T5: Suite de validación: catalog-crud, cart-logic, checkout-logic, order-rpc, adversarial-admin, tsc, lint, build
- [x] T6: Entregable final (17 puntos)

## Ruta declarada
- T3/T4: **direct inline** (T3 = 1 archivo grande pero diseño ya resuelto por inspección; delegación `task` falló por límite de tier de OpenCode — fallback documentado).

## Criterios de aceptación
- EN EL LOCAL y DELIVERY separados por tabs, sin recorrer la página. ✅
- Estados Pendiente/Preparando/Listo y acciones intactas. ✅
- Loading/error/empty/pending/error-mutación funcionales. ✅
- Responsive desktop/tablet/mobile sin scroll horizontal. ✅
- A11y: botones reales, labels, foco, teclado, no sólo color. ✅
- Suite completa verde, 0 errores tsc/lint, build OK. ✅

## Evidencia / progreso (2026-09-27)
- Validación final:
  - catalog-crud 47/47, cart-logic 20/20, checkout-logic 33/33, order-rpc 9/9, adversarial-admin 38/38
  - `tsc --noEmit` 0 errores; `pnpm lint` 0 errors / 8 warnings preexistentes (scripts); `pnpm build` OK, `/` sigue Dynamic (ƒ)
- Archivos modificados en F15.3:
  - `src/components/admin/AdminOrdersList.tsx` (reescritura)
  - `src/components/admin/AdminDashboardContent.tsx` (try/catch/finally en handleStatusChange)
  - `odd/tasks/f15-3-orders-panel-ux.md` (este doc)
- NO commit, NO push, NO migraciones, realtime intacto, server actions de pedidos intactas.
- Bug fuera de alcance: realtime de pedidos no llega (requiere F5) — pendiente para fase futura.
