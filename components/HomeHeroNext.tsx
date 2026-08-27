"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Writes --home-hero-chrome from the sticky header (auth row and mobile
 * URL-bar can change it) and scrolls the next homepage band into view.
 */
export function HomeHeroNext({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const [away, setAway] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const syncChrome = () => {
      const chrome = document.querySelector("[data-site-chrome]");
      const height = Math.ceil(chrome?.getBoundingClientRect().height ?? 56);
      root.style.setProperty("--home-hero-chrome", `${height}px`);
    };
    syncChrome();
    window.addEventListener("resize", syncChrome);
    window.visualViewport?.addEventListener("resize", syncChrome);
    return () => {
      root.style.removeProperty("--home-hero-chrome");
      window.removeEventListener("resize", syncChrome);
      window.visualViewport?.removeEventListener("resize", syncChrome);
    };
  }, []);

  useLayoutEffect(() => {
    const onScroll = () => {
      setAway(window.scrollY > 48);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goToNext() {
    const target = document.getElementById(targetId);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      className={`home-hero-cue max-md:hidden ${away ? "home-hero-cue--away" : ""}`}
      aria-controls={targetId}
      onClick={goToNext}
    >
      <span>{label}</span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M3.5 6 8 10.5 12.5 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
