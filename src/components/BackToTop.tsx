"use client";

import { useEffect, useState } from "react";
import { ArrowUpIcon } from "./icons";
import { focusRing } from "./ui";

/**
 * Discreet back-to-top control (bottom-right): appears after the hero,
 * yields to the footer so it never covers its CTAs, and while hidden it
 * is removed from pointer, assistive-technology and keyboard reach
 * (opacity, pointer-events, aria-hidden, inert, tabIndex).
 */
export function BackToTop() {
  const [pastHero, setPastHero] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const visible = pastHero && !footerInView;

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const footer = document.querySelector("footer");
    let observer: IntersectionObserver | undefined;
    if (footer) {
      observer = new IntersectionObserver(
        (entries) => setFooterInView(entries[0]?.isIntersecting ?? false),
        { threshold: 0 },
      );
      observer.observe(footer);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const onClick = () => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Volver al principio"
      aria-hidden={visible ? undefined : true}
      tabIndex={visible ? undefined : -1}
      inert={!visible}
      onClick={onClick}
      className={`fixed right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/50 bg-ink/60 text-brand-bright backdrop-blur transition-opacity duration-300 sm:right-6 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${focusRing}`}
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <ArrowUpIcon className="h-5 w-5" />
    </button>
  );
}
