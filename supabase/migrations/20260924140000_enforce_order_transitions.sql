-- =============================================================================
-- P7.2 Hardening: Add DB-level CHECK constraint for valid order status transitions
-- Prevents invalid transitions even if Server Action is bypassed.
-- =============================================================================

-- Add a check constraint that enforces valid transitions using a trigger function
-- Since CHECK constraints can't reference other rows, we use a trigger

create or replace function public.enforce_valid_order_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status public.order_status;
  new_status public.order_status;
begin
  -- Only validate on status changes
  if new.status = old.status then
    return new;
  end if;

  old_status := old.status;
  new_status := new.status;

  -- Define valid transitions
  if old_status = 'pending' and new_status = 'preparing' then
    return new;
  end if;
  if old_status = 'preparing' and new_status = 'ready' then
    return new;
  end if;

  -- All other transitions are invalid
  raise exception 'Invalid status transition: % -> %', old_status, new_status
    using errcode = 'P0001';
end;
$$;

revoke execute on function public.enforce_valid_order_transition() from PUBLIC, anon, authenticated, service_role;
grant execute on function public.enforce_valid_order_transition() to authenticated;

drop trigger if exists enforce_order_transition on public.orders;
create trigger enforce_order_transition
  before update of status on public.orders
  for each row
  execute function public.enforce_valid_order_transition();