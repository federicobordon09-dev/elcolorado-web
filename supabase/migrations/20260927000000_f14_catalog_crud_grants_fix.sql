-- =============================================================================
-- F14.1 (fix): Completar grants y RLS para categories/products — idempotente
-- =============================================================================
-- Esta migración corrige la aplicación parcial de 20260926000000_f14_catalog_crud_grants.sql
-- Usa bloques DO $$ para ser idempotente: solo crea lo que no existe.
-- No modifica migraciones históricas.
-- =============================================================================

-- --- Column-level GRANTS para authenticated (idempotentes en PG) ---
-- Los grants son idempotentes en PostgreSQL: si ya existen, no fallan.

grant insert on public.categories to authenticated;
grant update (label, featured, options, sort_order, updated_at) on public.categories to authenticated;

grant insert (id, category_id, name, presentations, sort_order, is_available, price_cents) on public.products to authenticated;
grant update (category_id, name, presentations, sort_order, is_available, price_cents, updated_at) on public.products to authenticated;

-- NOTA: NO se otorga DELETE a authenticated en categories ni products.

-- --- RLS Policies idempotentes ---

-- Categories: INSERT
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'categories' and policyname = 'staff_insert_categories'
  ) then
    create policy "staff_insert_categories" on public.categories
      for insert to authenticated
      with check (public.is_staff());
  end if;
end $$;

-- Categories: UPDATE
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'categories' and policyname = 'staff_update_categories'
  ) then
    create policy "staff_update_categories" on public.categories
      for update to authenticated
      using (public.is_staff())
      with check (public.is_staff());
  end if;
end $$;

-- Products: INSERT
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'staff_insert_products'
  ) then
    create policy "staff_insert_products" on public.products
      for insert to authenticated
      with check (public.is_staff());
  end if;
end $$;

-- Products: UPDATE (la original ya existía, pero nos aseguramos)
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

-- =============================================================================
-- Verificación post-aplicación (ejecutar manualmente en SQL Editor):
-- =============================================================================
-- \dp public.categories
-- \dp public.products
-- select policyname, cmd, qual from pg_policies
-- where schemaname = 'public' and tablename in ('categories','products')
-- and policyname like 'staff_%'
-- order by tablename, policyname;
--
-- Expected grants for authenticated on categories:
--   INSERT, UPDATE (label, featured, options, sort_order, updated_at)
-- Expected grants for authenticated on products:
--   INSERT (id, category_id, name, presentations, sort_order, is_available, price_cents),
--   UPDATE (category_id, name, presentations, sort_order, is_available, price_cents, updated_at)
-- Expected policies (4):
--   staff_insert_categories, staff_update_categories, staff_insert_products, staff_update_products
-- =============================================================================