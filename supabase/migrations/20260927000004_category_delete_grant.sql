-- F16.3: Grant DELETE on categories to authenticated + DELETE policy for staff
-- Permite a usuarios staff eliminar categorías físicamente (cuando no tienen productos)

-- Grant DELETE privilege to authenticated role
GRANT DELETE ON public.categories TO authenticated;

-- DELETE policy: only staff can delete categories
CREATE POLICY staff_delete_categories ON public.categories
  FOR DELETE TO authenticated
  USING (is_staff());