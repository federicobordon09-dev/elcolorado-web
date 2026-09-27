# F15.7 — Eliminación física de productos

## Objetivo
Agregar botón "Eliminar producto" en edición de ProductForm. DELETE físico real en BD, respetando restricciones FK.

## Hallazgos BD (MCP)

| Tabla | FK hacia products | ON DELETE | Notas |
|---|---|---|---|
| order_items | product_id → products.id | **RESTRICT** | Impide borrar producto con pedidos históricos. order_items guarda snapshots (product_name_snapshot, presentation, selected_option, unit_price_cents) — historial preservado. |

**Conclusión**: DELETE físico SÍ es posible para productos SIN order_items. Si hay order_items, PostgreSQL rechaza con error 23503 (FK violation). Server Action debe detectar y devolver error controlado.

## Políticas RLS actuales (products)
- `catalog_products_read`: SELECT anon/authenticated
- `staff_insert_products`: INSERT staff
- `staff_update_products`: UPDATE staff
- **NO existe policy DELETE** → debe agregarse

## Implementación completada

### 1. Server Action `deleteProduct` (admin.ts)
- Zod schema: `{ id, expectedUpdatedAt? }` + `.strict()`
- `requireStaff()` + validación Zod
- DELETE con optimistic locking (WHERE id AND updated_at = expectedUpdatedAt)
- Manejar error 23503 (FK restrict) → error controlado "No se puede eliminar: el producto tiene pedidos asociados. Usá 'No disponible' para conservar el historial."
- Manejar PGRST116 (not found / stale etag) → NOT_FOUND / CONFLICT
- `revalidatePath("/admin")` + `revalidatePath("/")` (F15.6 sincroniza carta pública)

### 2. RLS Policy (migración 20260927000002_product_delete_rls.sql)
```sql
CREATE POLICY staff_delete_products ON public.products
  FOR DELETE TO authenticated
  USING (is_staff());
```

### 3. UI - ProductForm
- Botón "Eliminar producto" (destructivo, rojo, separado de Guardar)
- Confirmación `confirm()` antes con mensaje claro de que es permanente
- Estado pending "Eliminando producto..."
- Error → formulario abierto, pending limpio, toast error
- Éxito → cerrar formulario, toast éxito (una vez), listado actualizado

### 4. AdminProductsList
- Botón "Eliminar" siempre visible (ícono Trash2, rojo)
- Estado pending con spinner
- Deshabilitado durante otras operaciones

### 5. AdminDashboardContent
- `handleDeleteProduct` llama a `deleteProduct`
- Maneja códigos: CONFLICT, HAS_ORDERS, NOT_FOUND
- Limpia estado `isDeletingProduct`
- Actualiza listado local tras éxito (filtra el eliminado)
- Cierra formulario si estaba abierto para ese producto

### 6. Tests (catalog-crud.check.mjs) — Agregados
- DELETE exitoso producto sin referencias
- Producto inexistente
- CONFLICT (optimistic locking)
- FK violation (producto con order_items) → error controlado HAS_ORDERS
- Anon no puede DELETE (RLS)
- Staff SÍ puede DELETE (RLS)

## Archivos creados/modificados

### Creados
- `supabase/migrations/20260927000002_product_delete_rls.sql` — Policy DELETE para staff

### Modificados
- `src/lib/actions/admin.ts` — schema DeleteProductInput, type DeleteProductResult, función deleteProduct
- `src/components/admin/ProductForm.tsx` — props onDelete/isDeleting, botón "Eliminar producto" en footer (modo edit)
- `src/components/admin/AdminProductsList.tsx` — props onDelete/isDeleting, botón "Eliminar" con Trash2 icon
- `src/components/admin/AdminDashboardContent.tsx` — estado isDeletingProduct, handleDeleteProduct, wiring onDelete/isDeleting

## Validación
- catalog-crud: 47/47 ✅ (incluye tests nuevos de DELETE)
- cart-logic: 20/20 ✅
- checkout-logic: 33/33 ✅
- order-rpc: 9/9 ✅
- adversarial-admin: 38/38 ✅
- tsc: 0 errores ✅
- lint: 0 errors (11 warnings preexistentes) ✅
- build: OK — `/` sigue Dynamic (ƒ) ✅

## Migración
**Creada**: `supabase/migrations/20260927000002_product_delete_rls.sql`
```sql
CREATE POLICY staff_delete_products ON public.products
  FOR DELETE TO authenticated
  USING (is_staff());
```
**NO aplicada automáticamente** — debe ejecutarse en Supabase SQL Editor.

## Comportamiento con pedidos asociados
- Si producto tiene order_items (FK RESTRICT): deleteProduct devuelve `code: "HAS_ORDERS"` con mensaje claro
- UI muestra error, formulario permanece abierto, pending se limpia
- Usuario debe usar "No disponible" (archiveProduct) para ocultar del catálogo público

## Confirmaciones
- ✅ NO commit / NO push
- ✅ F15.1 (`force-dynamic`) intacta — `/` sigue Dynamic (ƒ)
- ✅ F15.2 (estados formulario) intacta
- ✅ F15.3 (tabs pedidos) intacta
- ✅ F15.4 (realtime pedidos) intacta
- ✅ F15.5 (toast duplicado) intacta
- ✅ F15.6 (realtime catálogo) intacta — revalidatePath("/") + router.refresh() sincronizan
- ✅ No se tocó checkout, carrito, pedidos, order RPC, realtime de pedidos
- ✅ No se implementó DELETE en cascada ni se borraron order_items/pedidos
- ✅ Seguridad/RLS mantenida (policy DELETE solo para staff)