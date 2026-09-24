-- =============================================================================
-- El Colorado ordering MVP — Phase 1: initial schema, RLS and grants
-- Creation-only migration (no pre-existing data of this system is modified).
--
-- Security invariants:
--   * RLS deny-by-default on every table.
--   * anon: catalog SELECT only; no direct access to orders/order_items.
--     Public order confirmation only via get_order_by_token(p_token uuid).
--   * authenticated: admin powers only via is_staff(); column-limited UPDATE
--     (orders.status + updated_at; products.is_available + updated_at).
--   * service_role: only writer of orders/order_items (Phase 4 Server Action).
--   * staff_users: no API policies/grants at all (owner/SQL only).
--   * All SECURITY DEFINER functions pin search_path = ''.
--   * No policy grants INSERT or DELETE to anon or authenticated.
-- Seed follows in 20260924120100_seed_catalog_from_menu.sql.
-- =============================================================================

-- --- Enums ----------------------------------------------------------------------
create type public.order_mode as enum ('dine_in', 'takeaway');
create type public.order_status as enum ('pending', 'preparing', 'ready', 'delivered', 'cancelled');

-- --- Tables ---------------------------------------------------------------------
create table public.categories (
  id         text primary key,
  label      text not null check (btrim(label) <> ''),
  featured   boolean not null default false,
  options    jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id            text primary key,
  category_id   text not null references public.categories (id) on delete restrict,
  name          text not null check (btrim(name) <> ''),
  presentations text[] not null default '{}',
  sort_order    integer not null default 0,
  is_available  boolean not null default true,
  price_cents   integer check (price_cents is null or price_cents >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   bigint generated always as identity,
  public_token   uuid not null default gen_random_uuid(),
  status         public.order_status not null default 'pending',
  mode           public.order_mode not null,
  table_label    text,
  customer_name  text not null check (btrim(customer_name) <> ''),
  customer_phone text check (customer_phone is null or char_length(customer_phone) between 1 and 30),
  total_cents    integer check (total_cents is null or total_cents >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint orders_order_number_uq unique (order_number),
  constraint orders_public_token_uq unique (public_token),
  constraint orders_customer_name_len check (char_length(customer_name) <= 80),
  constraint orders_table_label_by_mode check (
    (mode = 'dine_in'
      and table_label is not null
      and btrim(table_label) <> ''
      and char_length(table_label) <= 40)
    or (mode = 'takeaway' and table_label is null)
  )
);

create table public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  product_id            text not null references public.products (id) on delete restrict,
  product_name_snapshot text not null check (btrim(product_name_snapshot) <> ''),
  presentation          text check (presentation is null or char_length(presentation) <= 60),
  selected_option       text check (selected_option is null or char_length(selected_option) <= 60),
  quantity              integer not null check (quantity between 1 and 20),
  unit_price_cents      integer check (unit_price_cents is null or unit_price_cents >= 0),
  note                  text check (note is null or char_length(note) <= 280),
  created_at            timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.staff_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Identity sequence: only service_role ever inserts orders (Phase 4).
grant usage, select on sequence public.orders_order_number_seq to service_role;

-- --- updated_at triggers ---------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from PUBLIC, anon, authenticated, service_role;

create trigger categories_touch_updated_at before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger products_touch_updated_at before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();

-- --- Staff check (SECURITY DEFINER, pinned search_path) --------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_users s
    where s.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_staff() from PUBLIC, anon, authenticated, service_role;
grant execute on function public.is_staff() to authenticated;

-- --- Public order lookup by secret token (no enumeration: exact uuid match) ------
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number',  o.order_number,
    'status',        o.status,
    'mode',          o.mode,
    'table_label',   o.table_label,
    'customer_name', o.customer_name,
    'total_cents',   o.total_cents,
    'created_at',    o.created_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_name',    i.product_name_snapshot,
            'presentation',    i.presentation,
            'selected_option', i.selected_option,
            'quantity',        i.quantity,
            'note',            i.note
          )
          order by i.created_at, i.id
        )
        from public.order_items i
        where i.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.public_token = p_token;
$$;

revoke execute on function public.get_order_by_token(uuid) from PUBLIC, anon, authenticated, service_role;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;

-- --- RLS enabled on every table (deny-by-default) --------------------------------
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.orders     enable row level security;
alter table public.order_items enable row level security;
alter table public.staff_users enable row level security;

-- --- Policies --------------------------------------------------------------------
-- Catalog: public read (staff edit goes through the UPDATE grant + policy below).
create policy "catalog_categories_read" on public.categories
  for select to anon, authenticated using (true);
create policy "catalog_products_read" on public.products
  for select to anon, authenticated using (true);

-- Orders: staff only; column-limited UPDATE is enforced by the grant, RLS by these policies.
create policy "staff_read_orders" on public.orders
  for select to authenticated using (public.is_staff());
create policy "staff_update_orders" on public.orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Order items: staff read only (inserts happen via service_role / Phase 4).
create policy "staff_read_order_items" on public.order_items
  for select to authenticated using (public.is_staff());

-- Products availability flip (staff).
create policy "staff_update_products" on public.products
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- staff_users: intentionally ZERO policies (owner/SQL only, never via API).

-- --- Grants: explicit minimal matrix ---------------------------------------------
revoke all on public.categories, public.products, public.orders, public.order_items, public.staff_users
  from anon, authenticated;
revoke all on public.staff_users from service_role;

grant select on public.categories, public.products to anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status, updated_at) on public.orders to authenticated;
grant update (is_available, updated_at) on public.products to authenticated;

grant select on public.categories, public.products to service_role;
grant select, insert, update, delete on public.orders, public.order_items to service_role;

-- --- Future objects: stop Supabase auto-expose defaults --------------------------
alter default privileges in schema public
  revoke select, insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated, service_role;
alter default privileges in schema public
  revoke execute on functions from PUBLIC, anon, authenticated, service_role;
alter default privileges in schema public
  revoke usage, select on sequences from anon, authenticated;
