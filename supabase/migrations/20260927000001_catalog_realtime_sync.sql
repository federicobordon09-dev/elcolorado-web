-- F15.6: Publicar tablas de catálogo en supabase_realtime
-- Permite suscripción Realtime desde la carta pública (/)
-- para sincronización automática sin F5.

-- Verificar que la publicación existe y agregar tablas
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.products;