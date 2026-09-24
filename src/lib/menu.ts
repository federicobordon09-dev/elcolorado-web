/**
 * Menu content transcribed from the official 2-page PDF menu of El Colorado Resto Bar.
 *
 * ROLE (Phase 2): SEED / TRANSCRIPTION SOURCE ONLY.
 * The live catalog is read from Supabase by `src/lib/catalog.ts`
 * (`getMenuCatalog()`); the render path must NOT import `menuCategories`
 * as a runtime value here. This file stays the source of truth for the
 * initial seed migration and for the shared TypeScript types re-exported
 * by `catalog.ts`.
 *
 * Content rules (mandatory):
 * - Product names follow the PDF. Presentation-level orthography errors are
 *   corrected (e.g. "jamon" -> "jamón"), but commercial names are kept as-is
 *   until confirmed (e.g. "Mozarella" stays "Mozarella").
 * - The PDF contains NO prices: never render prices until the business provides them.
 * - No invented ingredients, descriptions, schedules, promotions or services.
 * - Ambiguous PDF entries stay in `pendingNotes` and are intentionally NOT
 *   rendered in the public UI (internal documentation only).
 */

export interface MenuOption {
  /** Stable identifier, unique within the category. */
  id: string;
  /** Human label for the option group (e.g. "Preparación"). */
  label: string;
  /** Values exactly as grounded in the PDF. */
  values: readonly string[];
}

export interface MenuProduct {
  /** Stable identifier, unique within the menu. */
  id: string;
  /** Name exactly as written in the PDF (with presentation orthography fixes). */
  name: string;
  /** Units / presentations exactly as shown in the PDF (never prices). */
  presentations?: readonly string[];
  /** References to `MenuOption.id` declared by the owning category. */
  optionIds?: readonly string[];
}

export interface MenuCategory {
  /** Anchor id used by navigation (also the section DOM id). */
  id: string;
  label: string;
  /** Editorial emphasis: gives the largest section more visual presence. */
  featured?: boolean;
  products: readonly MenuProduct[];
  /** Option groups available for the whole category (rendered as passive info). */
  options?: readonly MenuOption[];
  /**
   * Internal pending items. NEVER rendered in the public UI until confirmed
   * with the business.
   */
  pendingNotes?: readonly string[];
}

export const menuCategories: readonly MenuCategory[] = [
  {
    id: "pizzas",
    label: "Pizzas",
    featured: true,
    products: [
      { id: "pizza-mozarella", name: "Mozarella" },
      { id: "pizza-mozarella-doble", name: "Mozarella doble" },
      { id: "pizza-especial", name: "Especial" },
      { id: "pizza-palmitos", name: "Palmitos" },
      { id: "pizza-anchoas", name: "Anchoas" },
      { id: "pizza-cantimpalo", name: "Cantimpalo" },
      { id: "pizza-serrana", name: "Serrana" },
      { id: "pizza-napolitana", name: "Napolitana" },
      { id: "pizza-queso-azul", name: "Queso azul" },
      { id: "pizza-anana", name: "Ananá" },
    ],
  },
  {
    id: "sandwiches",
    label: "Sandwiches",
    products: [
      { id: "sandwich-tostado-arabe", name: "Tostado de pan árabe, jamón y queso" },
      { id: "sandwich-tostado-miga", name: "Tostado de pan de miga, jamón y queso" },
      { id: "sandwich-pan-casero", name: "Pan casero, rúcula, jamón crudo y queso" },
    ],
  },
  {
    id: "vizcacheras",
    label: "Vizcacheras",
    products: [
      { id: "vizcachera-pollo", name: "Pollo, jamón y queso" },
      { id: "vizcachera-verduras", name: "Verduras salteadas y queso" },
      { id: "vizcachera-bondiola", name: "Bondiola, cebolla caramelizada y barbacoa" },
    ],
  },
  {
    id: "licuados",
    label: "Licuados",
    options: [
      {
        id: "licuado-base",
        label: "Preparación",
        values: ["de agua", "de leche"],
      },
    ],
    products: [
      { id: "licuado-banana", name: "Banana", optionIds: ["licuado-base"] },
      { id: "licuado-durazno", name: "Durazno", optionIds: ["licuado-base"] },
      { id: "licuado-frutilla", name: "Frutilla", optionIds: ["licuado-base"] },
      { id: "licuado-anana", name: "Ananá", optionIds: ["licuado-base"] },
    ],
  },
  {
    id: "cafeteria",
    label: "Cafetería",
    products: [
      { id: "cafe-cafe", name: "Café" },
      { id: "cafe-cortado", name: "Cortado" },
      { id: "cafe-cafe-con-leche", name: "Café con leche" },
      { id: "cafe-capuchino", name: "Capuchino" },
      { id: "cafe-chocolate", name: "Chocolate" },
      { id: "cafe-te", name: "Té" },
      { id: "cafe-medialuna", name: "Medialuna" },
      { id: "cafe-torta-raspadita", name: "Torta raspadita" },
    ],
    pendingNotes: [
      'The PDF shows "Chico / Mediano / Grande" sizes, but the exact scope is unknown (which products they apply to). Not rendered in the public UI until confirmed.',
    ],
  },
  {
    id: "bebidas",
    label: "Bebidas",
    products: [
      {
        id: "bebida-gaseosas",
        name: "Gaseosas",
        presentations: ["500 ml", "1,25 L", "1 L"],
      },
      {
        id: "bebida-agua-saborizada",
        name: "Agua saborizada",
        presentations: ["500 ml", "1 L"],
      },
    ],
    pendingNotes: [
      "The PDF does not specify brands or flavors for sodas / flavored water. Nothing to render until the business provides them.",
    ],
  },
  {
    id: "cervezas",
    label: "Cervezas",
    products: [
      { id: "cerveza-andes", name: "Andes" },
      { id: "cerveza-quilmes", name: "Quilmes" },
      { id: "cerveza-andes-origen", name: "Andes Origen" },
      { id: "cerveza-stella-artois", name: "Stella Artois" },
    ],
    pendingNotes: [
      'The PDF lists "Latas" under beers. It is ambiguous (product vs. presentation) and must not become an independent product until confirmed. Do not render that ambiguity in the public UI.',
    ],
  },
  {
    id: "tragos",
    label: "Tragos",
    products: [
      { id: "trago-fernet", name: "Fernet" },
      { id: "trago-gancia", name: "Gancia" },
      { id: "trago-campari", name: "Campari" },
      { id: "trago-gin-tonic", name: "Gin tonic" },
    ],
  },
];
