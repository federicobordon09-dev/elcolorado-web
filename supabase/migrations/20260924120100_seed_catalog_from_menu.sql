-- =============================================================================
-- El Colorado ordering MVP — Phase 1: catalog seed from src/lib/menu.ts
-- Idempotent (ON CONFLICT DO UPDATE), re-runnable. No deletes.
-- Rules:
--   * NEVER touches is_available (operational flag, default true on insert).
--   * NEVER sets price_cents (menu.ts has no prices → stays NULL).
--   * options live on categories (matches menu.ts structure).
-- Derived from menu.ts at Phase 1 time: 8 categories, 38 products.
-- =============================================================================

insert into public.categories (id, label, featured, options, sort_order) values
  ('pizzas',       'Pizzas',       true,  '[]'::jsonb, 0),
  ('sandwiches',   'Sandwiches',   false, '[]'::jsonb, 1),
  ('vizcacheras',  'Vizcacheras',  false, '[]'::jsonb, 2),
  ('licuados',     'Licuados',     false, '[{"id":"licuado-base","label":"Preparación","values":["de agua","de leche"]}]'::jsonb, 3),
  ('cafeteria',    'Cafetería',    false, '[]'::jsonb, 4),
  ('bebidas',      'Bebidas',      false, '[]'::jsonb, 5),
  ('cervezas',     'Cervezas',     false, '[]'::jsonb, 6),
  ('tragos',       'Tragos',       false, '[]'::jsonb, 7)
on conflict (id) do update set
  label      = excluded.label,
  featured   = excluded.featured,
  options    = excluded.options,
  sort_order = excluded.sort_order;

insert into public.products (id, category_id, name, presentations, sort_order) values
  -- pizzas (10)
  ('pizza-mozarella',    'pizzas',      'Mozarella',                    '{}', 0),
  ('pizza-mozarella-doble','pizzas',    'Mozarella doble',              '{}', 1),
  ('pizza-especial',     'pizzas',      'Especial',                     '{}', 2),
  ('pizza-palmitos',     'pizzas',      'Palmitos',                     '{}', 3),
  ('pizza-anchoas',      'pizzas',      'Anchoas',                      '{}', 4),
  ('pizza-cantimpalo',   'pizzas',      'Cantimpalo',                   '{}', 5),
  ('pizza-serrana',      'pizzas',      'Serrana',                      '{}', 6),
  ('pizza-napolitana',   'pizzas',      'Napolitana',                   '{}', 7),
  ('pizza-queso-azul',   'pizzas',      'Queso azul',                   '{}', 8),
  ('pizza-anana',        'pizzas',      'Ananá',                        '{}', 9),
  -- sandwiches (3)
  ('sandwich-arabe',     'sandwiches',  'Tostado de pan árabe, jamón y queso', '{}', 0),
  ('sandwich-miga',      'sandwiches',  'Tostado de pan de miga, jamón y queso', '{}', 1),
  ('sandwich-casero',    'sandwiches',  'Pan casero, rúcula, jamón crudo y queso', '{}', 2),
  -- vizcacheras (3)
  ('vizcachera-pollo',   'vizcacheras', 'Pollo, jamón y queso',         '{}', 0),
  ('vizcachera-verduras','vizcacheras', 'Verduras salteadas y queso',   '{}', 1),
  ('vizcachera-bondiola', 'vizcacheras','Bondiola, cebolla caramelizada y barbacoa', '{}', 2),
  -- licuados (4)
  ('licuado-banana',     'licuados',    'Banana',                       '{}', 0),
  ('licuado-durazno',    'licuados',    'Durazno',                      '{}', 1),
  ('licuado-frutilla',   'licuados',    'Frutilla',                     '{}', 2),
  ('licuado-anana',      'licuados',    'Ananá',                        '{}', 3),
  -- cafeteria (8)
  ('cafe',               'cafeteria',   'Café',                         '{}', 0),
  ('cortado',            'cafeteria',   'Cortado',                      '{}', 1),
  ('cafe-con-leche',     'cafeteria',   'Café con leche',               '{}', 2),
  ('capuchino',          'cafeteria',   'Capuchino',                    '{}', 3),
  ('chocolate',          'cafeteria',   'Chocolate',                    '{}', 4),
  ('te',                 'cafeteria',   'Té',                           '{}', 5),
  ('medialuna',          'cafeteria',   'Medialuna',                    '{}', 6),
  ('torta-raspadita',    'cafeteria',   'Torta raspadita',              '{}', 7),
  -- bebidas (2) — presentations from menu.ts
  ('bebida-gaseosas',    'bebidas',     'Gaseosas',                     '{"500 ml","1,25 L","1 L"}', 0),
  ('bebida-agua-saborizada','bebidas',  'Agua saborizada',              '{"500 ml","1 L"}', 1),
  -- cervezas (4)
  ('cerveza-andes',      'cervezas',    'Andes',                        '{}', 0),
  ('cerveza-quilmes',    'cervezas',    'Quilmes',                      '{}', 1),
  ('cerveza-andes-origen','cervezas',   'Andes Origen',                 '{}', 2),
  ('cerveza-stella',     'cervezas',    'Stella Artois',                '{}', 3),
  -- tragos (4)
  ('trago-fernet',       'tragos',      'Fernet',                       '{}', 0),
  ('trago-gancia',       'tragos',      'Gancia',                       '{}', 1),
  ('trago-campari',      'tragos',      'Campari',                      '{}', 2),
  ('trago-gin-tonic',    'tragos',      'Gin tonic',                    '{}', 3)
on conflict (id) do update set
  category_id   = excluded.category_id,
  name          = excluded.name,
  presentations = excluded.presentations,
  sort_order    = excluded.sort_order;
  -- is_available and price_cents intentionally NOT in the SET list.
