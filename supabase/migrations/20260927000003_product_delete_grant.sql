-- F15.7 fix: Grant DELETE (and INSERT/UPDATE for staff) on products to authenticated
-- RLS policy staff_delete_products already exists but table grant was missing.
-- authenticated needs DELETE for staff_delete_products policy to work.
-- Also grant INSERT/UPDATE for existing staff_insert_products / staff_update_products policies.

GRANT DELETE ON public.products TO authenticated;
GRANT INSERT ON public.products TO authenticated;
GRANT UPDATE ON public.products TO authenticated;