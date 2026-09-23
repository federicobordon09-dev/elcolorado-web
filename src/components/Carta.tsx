import {
  menuCategories,
  type MenuCategory,
  type MenuProduct,
} from "@/lib/menu";
import { MenuNav } from "./MenuNav";
import { Reveal } from "./Reveal";
import { BrushSwash } from "./ui";
import {
  BeerIcon,
  BottleIcon,
  CocktailIcon,
  CoffeeIcon,
  PizzaIcon,
  RollIcon,
  SandwichIcon,
  ShakeIcon,
  type IconProps,
} from "./icons";

const categoryIcons: Record<
  string,
  (props: IconProps) => React.JSX.Element
> = {
  pizzas: PizzaIcon,
  sandwiches: SandwichIcon,
  vizcacheras: RollIcon,
  licuados: ShakeIcon,
  cafeteria: CoffeeIcon,
  bebidas: BottleIcon,
  cervezas: BeerIcon,
  tragos: CocktailIcon,
};

type Treatment = "featured" | "standard" | "compact";

/**
 * Gastronomic hierarchy without breaking the system:
 * - featured: the largest section (Pizzas) gets more presence.
 * - compact: 2-product sections get a lighter footprint.
 * - standard: everything else keeps the base rhythm.
 */
function getTreatment(category: MenuCategory): Treatment {
  if (category.featured) return "featured";
  if (category.products.length <= 2) return "compact";
  return "standard";
}

function ProductRow({
  product,
  treatment,
}: {
  product: MenuProduct;
  treatment: Treatment;
}) {
  const hasPresentations =
    product.presentations !== undefined && product.presentations.length > 0;

  return (
    <li className="border-b border-line/60 py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand transition-transform duration-200 group-hover:scale-150"
        />
        <span
          className={`font-medium leading-snug text-cream ${
            treatment === "featured" ? "text-base" : "text-[15px]"
          }`}
        >
          {product.name}
        </span>
      </div>
      {hasPresentations && (
        <p className="mt-1 pl-[1.375rem] text-sm leading-snug text-cream-dim">
          Presentaciones: {product.presentations!.join(" · ")}
        </p>
      )}
    </li>
  );
}

function CategorySection({
  category,
  index,
}: {
  category: MenuCategory;
  index: number;
}) {
  const titleId = `${category.id}-title`;
  const treatment = getTreatment(category);
  const Icon = categoryIcons[category.id];

  const titleSize =
    treatment === "featured"
      ? "text-4xl sm:text-6xl"
      : treatment === "compact"
        ? "text-2xl sm:text-3xl"
        : "text-3xl sm:text-4xl";

  const iconSize =
    treatment === "featured"
      ? "h-8 w-8 sm:h-10 sm:w-10"
      : treatment === "compact"
        ? "h-5 w-5"
        : "h-6 w-6";

  const listCols = treatment === "compact" ? "grid-cols-1" : "sm:grid-cols-2";

  return (
    <section
      id={category.id}
      aria-labelledby={titleId}
      className="relative pt-12 sm:pt-16"
    >
      {treatment === "featured" && (
        <PizzaWatermark />
      )}

      <Reveal>
        <header className="relative flex items-center gap-3 sm:gap-4">
          <span className="font-display text-sm tabular-nums text-brand-bright">
            {String(index + 1).padStart(2, "0")}
          </span>
          {Icon && <Icon className={`shrink-0 text-brand ${iconSize}`} />}
          <h3
            id={titleId}
            className={`font-display uppercase leading-none tracking-wide text-cream ${titleSize}`}
          >
            {category.label}
          </h3>
          <span
            aria-hidden="true"
            className="hidden h-px flex-1 bg-line sm:block"
          />
        </header>

        {category.options?.map((option) => (
          <p key={option.id} className="mt-3 text-sm text-cream-dim">
            {option.label}:{" "}
            <span className="font-medium text-brand-bright">
              {option.values.join(" o ")}
            </span>
          </p>
        ))}

        {/* category.pendingNotes are internal and intentionally not rendered. */}
        <ul className={`mt-5 grid gap-x-12 ${listCols}`}>
          {category.products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              treatment={treatment}
            />
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

/** Faint pizza illustration giving the featured section its own identity. */
function PizzaWatermark() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-2 hidden text-brand/10 sm:block"
    >
      <PizzaIcon className="h-44 w-44 rotate-12" strokeWidth={1} />
    </span>
  );
}

/**
 * The menu section itself. Structured content (never text in images),
 * no prices, subtle hierarchy between categories.
 */
export function Carta() {
  const navCategories = menuCategories.map(({ id, label }) => ({ id, label }));

  return (
    <section
      id="carta"
      aria-labelledby="carta-title"
      className="border-t border-line"
    >
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16">
        <Reveal>
          <h2
            id="carta-title"
            className="font-display text-5xl uppercase leading-none tracking-wide sm:text-6xl"
          >
            La carta
          </h2>
          <BrushSwash className="mt-3 w-36 text-brand sm:w-44" />
        </Reveal>
      </div>

      {/* Sticky chip bar — sticks only while the menu section is on screen. */}
      <div className="sticky top-0 z-30 mt-8 border-y border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <MenuNav categories={navCategories} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {menuCategories.map((category, index) => (
          <CategorySection
            key={category.id}
            category={category}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
