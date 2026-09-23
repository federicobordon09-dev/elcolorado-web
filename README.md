# El Colorado Resto Bar — Web

Sitio oficial de **El Colorado Resto Bar** (La Consulta · San Carlos · Mendoza).
Landing one-page con la carta del negocio y datos de contacto.

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind CSS · `next/font`.

- No hay backend, base de datos, auth, CMS ni dependencias nuevas.
- No hay precios: el menú PDF oficial no incluye precios. La UI no muestra ni inventa precios.
- No hay fotos: la galería se mostrará cuando existan fotos reales del negocio. No se usan imágenes de stock ni generadas.

## Estructura

```
src/
  app/
    layout.tsx      # Metadata es-AR, fuentes (Geist / Bebas Neue / Caveat), skip-link
    page.tsx        # Hero → Experiencia → Carta → Visitar
    globals.css     # Tokens de diseño, motion progresivo, a11y base
    fonts.ts        # next/font/google
  components/       # Header, Hero, Experiencia, Carta, MenuNav, Visitar, Footer, ui, icons, Reveal
  lib/
    menu.ts         # Data tipada del menú (categorías / productos / variantes / opciones)
    business.ts     # Datos de contacto verificados + pendientes internos
```

### Arquitectura de contenido

`src/lib/menu.ts` modela la carta como **datos tipados locales**, pensados para
convertirse en entidades reales más adelante sin reescribir la UI:

- `MenuCategory` → categorías (8, anclas de navegación).
- `MenuProduct` → productos (38) con `presentations` (variantes/presentaciones, p. ej. `500 ml · 1,25 L · 1 L`).
- `MenuOption` → opciones de preparación asociadas a una categoría (p. ej. licuados `de agua / de leche`), renderizadas como **información pasiva**, nunca como controles.
- `pendingNotes` → ambigüedades internas del PDF; **nunca se renderizan** en la UI pública.

## Datos verificados (fuente: menú PDF oficial, 2 páginas)

| Dato | Valor mostrado públicamente | Nota |
| --- | --- | --- |
| Categorías | 8 (Pizzas, Sandwiches, Vizcacheras, Licuados, Cafetería, Bebidas, Cervezas, Tragos) | tal como el PDF |
| Productos | 38 | ninguno inventado |
| Precios | no se muestran | el PDF no tiene precios |
| Horarios / delivery / reservas | no se muestran | el PDF no los indica |
| Teléfono | `2622 373836`, CTA **Llamar** (`tel:+542622373836`) | **no** es afirmado como WhatsApp |
| Instagram | `@elcolorado.2024` → `instagram.com/elcolorado.2024` | perfil oficial |
| Dirección pública | `La Consulta · San Carlos · Mendoza` | etiqueta neutral hasta confirmar calle/número |

## Ortografía

- Se corrigen errores ortográficos evidentes de presentación que no cambian el
  producto: `jamon` → `jamón` (4 productos).
- Se mantienen nombres comerciales hasta confirmación: **`Mozarella`** queda
  `Mozarella` (no se "corrige" a Mozzarella).

## Pendientes de confirmación con el negocio

1. **Dirección exacta**: brief dice `San Martín 234, San Carlos`; el PDF dice
   `San Martin Norte 234, La Consulta`. Es **un único registro pendiente**, nunca
   dos sedes, y no se resuelve por suposición. La UI pública muestra solo la
   etiqueta neutral. Al confirmarse: actualizar `address` en `business.ts` y la
   tabla de arriba.
2. **¿Es WhatsApp?** El `2622 373836` solo puede pasar a CTA de WhatsApp cuando
   el negocio lo confirme (`phone.whatsappConfirmed` en `business.ts`).
3. **Cafetería — tamaños Chico/Mediano/Grande**: alcance ambiguo en el PDF;
   guardado en `pendingNotes`, no renderizado.
4. **Cervezas — "Latas"**: figura en el PDF pero puede ser presentación y no
   producto independiente. En `pendingNotes`, no renderizado.
5. **Logo/favicon oficiales**: se usa el del scaffold mientras tanto.
6. **Fotos reales**: fase pendiente; la galería no existe en la UI pública hasta
   entonces (el componente se recrea cuando haya assets).
7. **URL de Google Maps**: no hay link de mapa sin URL verificada.

## Desarrollo

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
```

## Validaciones de la fase 1.1

- `pnpm exec tsc --noEmit` — 0 errores.
- `pnpm lint` — 0 errores.
- `pnpm build` — OK (Next 16, Turbopack, rutas estáticas).
- HTML servido: sin copy interno de desarrollo, sin precios/horarios inventados,
  sin imágenes falsas, sin las dos direcciones contradictorias, teléfono solo
  como "Llamar", licuados como información y no como filtro, sin links a
  secciones eliminadas (Galería / Destacados).
