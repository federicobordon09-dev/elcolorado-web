"use client";

import { useEffect } from "react";

/**
 * Capture-phase interceptor for same-page `#…` links: smooth-scrolls to the
 * target without writing the hash (so reloads always start clean) and
 * blocks the Next.js router from taking over hash navigation (Link bails
 * out when the click is already default-prevented). Middle-click and
 * modified clicks are left untouched so the browser can open a new tab.
 * Menu chips, header/footer anchors and the skip link all go through here.
 */
export function AnchorNav() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const node = event.target;
      const anchor =
        node instanceof Element ? node.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      // Same-page anchors only: external, empty and javascript: hrefs bail.
      if (!href.startsWith("#")) return;

      // Blocks both the browser's default hash navigation and Next Link.
      // stopPropagation is intentionally NOT used so React onClick handlers
      // (e.g. the header mobile menu closing) still run.
      event.preventDefault();

      const id = href.slice(1);
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";

      if (id === "") {
        window.scrollTo({ top: 0, behavior });
      } else {
        const target = document.getElementById(id);
        if (target) {
          // scrollIntoView respects html's scroll-padding-top (sticky chip bar).
          target.scrollIntoView({ behavior });
          if (id === "main") {
            // Skip link: move keyboard focus without triggering a second scroll.
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        }
      }

      // Clean the URL hash without triggering another scroll or history entry.
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    };

    // Capture phase so the default is blocked before Next's Link handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
