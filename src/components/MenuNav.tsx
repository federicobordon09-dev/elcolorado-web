"use client";

import { useEffect, useRef, useState } from "react";

type MenuNavCategory = {
  id: string;
  label: string;
};

type MenuNavProps = {
  categories: readonly MenuNavCategory[];
};

/**
 * Sticky, horizontally scrollable chip navigation for the menu.
 * - Anchor links (works without JS).
 * - Scroll-spy highlights the visible section via IntersectionObserver.
 * - Active chip is kept in view inside the horizontal scroller.
 * - Edge fade (mobile) hints that there is more content sideways.
 */
export function MenuNav({ categories }: MenuNavProps) {
  const [active, setActive] = useState<string>(categories[0]?.id ?? "");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(category.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }

        if (visible.size === 0) return;

        // Choose the last section that starts above the band: among the (max two)
        // intersecting neighbours, the one with the LARGEST top is the section
        // the viewport is actually inside — picking the smallest top wrongly
        // keeps the previous category active after anchor navigation.
        let bestId = "";
        let bestTop = Number.NEGATIVE_INFINITY;
        for (const id of visible) {
          const el = document.getElementById(id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top > bestTop) {
            bestTop = top;
            bestId = id;
          }
        }
        if (bestId) setActive(bestId);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const chip = list.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!chip) return;

    const target =
      chip.offsetLeft - list.clientWidth / 2 + chip.clientWidth / 2;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    list.scrollTo({
      left: Math.max(0, target),
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <nav aria-label="Secciones de la carta">
      <ul
        ref={listRef}
        className="no-scrollbar scroll-fade-x flex gap-2 overflow-x-auto py-3"
      >
        {categories.map((category) => {
          const isActive = category.id === active;
          return (
            <li key={category.id}>
              <a
                href={`#${category.id}`}
                data-chip={category.id}
                aria-current={isActive ? "location" : undefined}
                className={`block shrink-0 rounded-full border px-4 py-1.5 font-display text-sm uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright ${
                  isActive
                    ? "border-brand bg-brand text-white"
                    : "border-line text-cream-dim hover:border-brand hover:text-cream"
                }`}
              >
                {category.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
