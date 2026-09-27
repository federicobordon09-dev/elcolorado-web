-- =============================================================================
-- Phase 10.2: Add delivery fields to orders table for "takeaway" mode
-- =============================================================================

-- Add new columns for delivery information
-- Both columns accept NULL to maintain compatibility with existing dine_in orders
-- and historical orders before this migration.
alter table public.orders
  add column delivery_address text,
  add column delivery_reference text;

-- Constraint: delivery_address rules by mode
-- Allows:
--   dine_in + NULL
--   takeaway + NULL (historical)
--   takeaway + valid address (5-200 chars, non-empty after trim)
-- Rejects:
--   dine_in + non-NULL delivery_address
--   takeaway + empty/whitespace delivery_address
--   takeaway + delivery_address < 5 chars
--   takeaway + delivery_address > 200 chars
alter table public.orders
  add constraint orders_delivery_address_by_mode check (
    (mode = 'dine_in' and delivery_address is null)
    or (mode = 'takeaway' and delivery_address is null)
    or (mode = 'takeaway'
      and delivery_address is not null
      and btrim(delivery_address) <> ''
      and char_length(delivery_address) between 5 and 200)
  );

-- Constraint: delivery_reference rules by mode
-- Allows:
--   dine_in + NULL
--   takeaway + NULL
--   takeaway + reference <= 200 chars
-- Rejects:
--   dine_in + non-NULL delivery_reference
--   takeaway + delivery_reference > 200 chars
alter table public.orders
  add constraint orders_delivery_reference_by_mode check (
    (mode = 'dine_in' and delivery_reference is null)
    or (mode = 'takeaway' and (delivery_reference is null or char_length(delivery_reference) <= 200))
  );