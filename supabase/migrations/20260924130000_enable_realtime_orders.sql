-- =============================================================================
-- Phase 6: Enable Realtime for orders table
-- Allows authenticated staff to receive INSERT/UPDATE events via Postgres Changes.
-- RLS policies already enforce staff-only access; realtime respects RLS.
-- =============================================================================

-- Add orders table to the supabase_realtime publication
-- This enables Postgres Changes streaming for this table.
-- Only authenticated users with SELECT permission (via staff_read_orders policy)
-- will receive events, because realtime respects RLS.
alter publication supabase_realtime add table public.orders;

-- Also add order_items for detail view consistency (optional but useful)
alter publication supabase_realtime add table public.order_items;