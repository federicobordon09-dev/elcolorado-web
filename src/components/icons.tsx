import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

/**
 * Line-art icon set designed for El Colorado, reinterpreting the black-line
 * illustrations of the original menu PDF. All icons are decorative
 * (aria-hidden); every icon link/button carries its own accessible label.
 */
function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Large pizza-slice illustration (black line art, meant to sit on red shapes). */
export function PizzaSliceArt(props: IconProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M100 24 44 158c17.5 9.2 94.5 9.2 112 0L100 24Z" />
      <path d="M44 158c17.5 9.2 94.5 9.2 112 0" strokeWidth={9} />
      <circle cx="89" cy="86" r="9" fill="currentColor" stroke="none" />
      <circle cx="115" cy="116" r="9" fill="currentColor" stroke="none" />
      <circle cx="86" cy="127" r="6.5" strokeWidth={4} />
      <path d="M100 46v16" strokeWidth={4} />
    </svg>
  );
}

/** Whole round pizza illustration (black line art, meant to sit on red shapes). */
export function PizzaRoundArt(props: IconProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="66" strokeWidth={3} />
      <path d="M100 100 54 54M100 100l46-46M100 100l-46 46M100 100l46 46" strokeWidth={3.5} />
      <circle cx="76" cy="74" r="7" fill="currentColor" stroke="none" />
      <circle cx="127" cy="80" r="7" fill="currentColor" stroke="none" />
      <circle cx="94" cy="128" r="7" fill="currentColor" stroke="none" />
      <circle cx="130" cy="127" r="5.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Compact pizza-slice mark for category headers. */
export function PizzaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 4.5 19.5c4.2 2.2 10.8 2.2 15 0L12 3Z" />
      <circle cx="10.4" cy="11.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.9" cy="14.6" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Sandwich: cross-section — bread slab, wavy filling, bread slab. */
export function SandwichIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11V9.5C4 6.5 6.5 4 9.5 4h5C17.5 4 20 6.5 20 9.5V11H4Z" />
      <path d="M4 13.5c1.3-1.2 2.7 1.2 4 0s2.7 1.2 4 0 2.7 1.2 4 0 2.7 1.2 4 0" />
      <path d="M4 17h16v1.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V17Z" />
    </Svg>
  );
}

/** Vizcachera: rolled sandwich — cylinder with a spiral cut end. */
export function RollIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <g transform="rotate(-12 12 12)">
        <path d="M7 8.5h9a5 5 0 0 1 0 7H7a5 5 0 0 1 0-7Z" />
        <ellipse cx="7" cy="12" rx="2.4" ry="3.5" />
        <path d="M6.4 10.6c1 .6 1.6 1.4 1.6 2.4" strokeWidth={1.2} />
        <path d="M11 8.5v7" strokeWidth={1.2} />
      </g>
    </Svg>
  );
}

/** Licuados: tall glass with a straw. */
export function ShakeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h8l-1.4 13.2A2 2 0 0 1 12.6 21h-1.2a2 2 0 0 1-2-1.8L8 6Z" />
      <path d="M8.6 11h6.8" strokeWidth={1.2} />
      <path d="m13.8 6 2.4-3.6" />
    </Svg>
  );
}

/** Cafetería: cup with saucer hint and steam. */
export function CoffeeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9h13v5.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M17 10.5h1.6a2.6 2.6 0 0 1 0 5.2H17" />
      <path d="M3 21h15" strokeWidth={1.2} />
      <path d="M7.4 6V4.4" />
      <path d="M11 6V4.4" />
      <path d="M14.6 6V4.4" />
    </Svg>
  );
}

/** Bebidas: bottle with cap and label line (unambiguous vs. a cup). */
export function BottleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 2.5h4v2c0 .8.3 1.5.9 2.1l.7.8c.6.7 1 1.6 1 2.5v9.6a2 2 0 0 1-2 2H9.4a2 2 0 0 1-2-2v-9.6c0-.9.4-1.8 1-2.5l.7-.8c.6-.6.9-1.3.9-2.1v-2Z" />
      <path d="M7.6 13.2h8.8" />
      <path d="M9.6 2.5h4.8" strokeWidth={2} />
    </Svg>
  );
}

/** Cervezas: mug with handle and foam line. */
export function BeerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5h8v12a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V5Z" />
      <path d="M15 8h1.6a2.6 2.6 0 0 1 0 5.2H15" />
      <path d="M7 9h8" strokeWidth={1.2} />
      <path d="M7 5c0-1.4 1.2-2.5 2.7-2.5S12.4 3.6 12.4 5" strokeWidth={1.2} />
    </Svg>
  );
}

/** Tragos: cocktail glass. */
export function CocktailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h14L12 13.2 5 5Z" />
      <path d="M12 13.2V19" />
      <path d="M8.5 19h7" />
      <circle cx="15.6" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

/** Arrow up for the back-to-top control (line art, decorative). */
export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}
