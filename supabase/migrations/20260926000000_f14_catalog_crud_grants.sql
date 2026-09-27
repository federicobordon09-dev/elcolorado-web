-- =============================================================================
-- F14: CRUD de carta — Grants y RLS para staff en categories y products
-- =============================================================================
-- Objetivo: Habilitar INSERT y UPDATE (column-limited) para staff autenticado
--           en categories y products, manteniendo RLS deny-by-default.
-- No se habilita DELETE físico. El archivado (soft-delete) se hará vía
-- Server Actions actualizando is_available=false (products) y featured=false (categories).
-- No se modifican migraciones históricas ni objetos existentes (orders, order_items, create_order, etc.).
-- =============================================================================

-- --- Column-level GRANTS para authenticated (staff usa is_staff() via RLS) ---
-- Las policies RLS abajo restringen a is_staff() = true.
-- El grant solo abre la puerta a nivel de columna; la policy decide QUIÉN puede usarlo.

-- Categories: INSERT + UPDATE (label, featured, options, sort_order, updated_at)
-- created_at tiene default now() y no se expone en INSERT (staff no lo setea).
grant insert on public.categories to authenticated;
grant update (label, featured, options, sort_order, updated_at) on public.categories to authenticated;

-- Products: INSERT + UPDATE extendido para F14
-- id, category_id, name, presentations, sort_order, is_available, price_cents, updated_at
-- created_at tiene default now() y no se expone en INSERT.
grant insert (id, category_id, name, presentations, sort_order, is_available, price_cents) on public.products to authenticated;
grant update (category_id, name, presentations, sort_order, is_available, price_cents, updated_at) on public.products to authenticated;

-- NOTA: NO se otorga DELETE a authenticated en categories ni products.
--       La FK order_items.product_id ON DELETE RESTRICT y products.category_id ON DELETE RESTRICT
--       ya impiden borrado físico si hay datos referenciados.
--       El soft-delete se implementa en capa de aplicación (Server Actions).

-- --- RLS Policies para staff (is_staff()) ---

-- Categories: INSERT
create policy "staff_insert_categories" on public.categories
  for insert to authenticated
  with check (public.is_staff());

-- Categories: UPDATE (USING + WITH CHECK para defensa en profundidad)
create policy "staff_update_categories" on public.categories
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Products: INSERT
create policy "staff_insert_products" on public.products
  for insert to authenticated
  with check (public.is_staff());

-- Products: UPDATE (extiende la policy existente "staff_update_products")
-- DROP y recreamos para ampliar columnas permitidas (la policy no lista columnas, el grant sí).
-- La policy existente ya usa is_staff() en USING y WITH CHECK.
-- Solo necesitamos asegurarnos de que la policy existe (ya existe).
-- Si por alguna razón no existiera, la creamos idempotentemente:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'staff_update_products'
  ) then
    create policy "staff_update_products" on public.products
      for update to authenticated
      using (public.is_staff())
      with check (public.is_staff());
  end if;
end $$;

-- --- Verificación de consistencia (solo informativo, no cambia estado) ---
-- Los siguientes SELECTs pueden ejecutarse manualmente tras aplicar la migración
-- para confirmar grants y policies:
--
-- \dp public.categories
-- \dp public.products
-- select * from pg_policies where schemaname = 'public' and tablename in ('categories','products');
--
-- Expected grants for authenticated on categories:
--   INSERT, UPDATE (label, featured, options, sort_order, updated_at)
-- Expected grants for authenticated on products:
--   INSERT (id, category_id, name, presentations, sort_order, is_available, price_cents),
--   UPDATE (category_id, name, presentations, sort_order, is_available, price_cents, updated_at)
-- Expected policies:
--   staff_insert_categories (INSERT, with check is_staff)
--   staff_update_categories (UPDATE, using/is_staff, with check/is_staff)
--   staff_insert_products (INSERT, with check is_staff)
--   staff_update_products (UPDATE, using/is_staff, with check/is_staff)  -- ya existía, se mantiene
-- Public read policies unchanged:
--   catalog_categories_read, catalog_products_read

-- =============================================================================
-- Fin de migración F14.1
-- =============================================================================