-- F15.7: Política RLS para DELETE en products (staff)
-- Permite a usuarios staff eliminar productos físicamente

CREATE POLICY staff_delete_products ON public.products
  FOR DELETE TO authenticated
  USING (is_staff());