import type { ReactNode } from "react";
import Link from "next/link";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright";

type BaseLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
};

/** Solid red CTA. White text on brand red passes AA (4.7:1). */
export function PrimaryLink({
  href,
  children,
  className = "",
  external = false,
}: BaseLinkProps) {
  const externalProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-brand-bright active:translate-y-0 ${focusRing} ${className}`}
      {...externalProps}
    >
      {children}
    </Link>
  );
}

/** Outlined secondary action. */
export function GhostLink({
  href,
  children,
  className = "",
  external = false,
}: BaseLinkProps) {
  const externalProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-cream/25 px-6 py-3 text-sm font-semibold text-cream transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-bright active:translate-y-0 ${focusRing} ${className}`}
      {...externalProps}
    >
      {children}
    </Link>
  );
}

/**
 * Hand-drawn marker stroke (SVG, not a skewed rectangle) — echo of the
 * underlined section titles in the original menu PDF.
 */
export function BrushSwash({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 11c34-5 68 3 104-2s68-6 108 2"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M40 15.5c30-3 58 1 84-2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
