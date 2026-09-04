"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { CauseyLogo } from "@/components/CauseyLogo";

/** Pages whose hero already shows the Causey lockup — header brand waits. */
const HERO_BRAND_PATHS = new Set([
  "/",
  "/districts",
  "/clubs",
  "/billing",
  "/portals",
]);

export function SiteHeader() {
  const pathname = usePathname();
  const usesHeroBrand = HERO_BRAND_PATHS.has(pathname);
  const [heroBrandIsPast, setHeroBrandIsPast] = useState(false);
  const showHeaderBrand = !usesHeroBrand || heroBrandIsPast;
  const navRef = useRef<HTMLElement>(null);
  const flipFromLeft = useRef<number | null>(null);

  useEffect(() => {
    if (!usesHeroBrand) {
      return;
    }

    // Layout hydrates before streamed hero content. Missing hero must stay
    // centered with no header mark — never treat that as "already scrolled."
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroBrandIsPast(false);

    let intersection: IntersectionObserver | null = null;
    let mutation: MutationObserver | null = null;
    let heroBrand: Element | null = null;

    const observeHero = () => {
      if (!heroBrand) return;
      intersection?.disconnect();
      const chrome = document.querySelector("[data-site-chrome]");
      const topInset = Math.ceil(chrome?.getBoundingClientRect().height ?? 56);
      intersection = new IntersectionObserver(
        ([entry]) => {
          const past = !entry.isIntersecting;
          setHeroBrandIsPast((current) => {
            if (current === past) return current;
            const nav = navRef.current;
            if (
              nav &&
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
              flipFromLeft.current = nav.getBoundingClientRect().left;
            }
            return past;
          });
        },
        { threshold: 0, rootMargin: `-${topInset}px 0px 0px 0px` }
      );
      intersection.observe(heroBrand);
    };

    const attachHero = () => {
      const next = document.querySelector("[data-hero-brand]");
      if (!next) return false;
      heroBrand = next;
      mutation?.disconnect();
      mutation = null;
      observeHero();
      return true;
    };

    if (!attachHero()) {
      mutation = new MutationObserver(() => {
        attachHero();
      });
      mutation.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("resize", observeHero);
    return () => {
      intersection?.disconnect();
      mutation?.disconnect();
      window.removeEventListener("resize", observeHero);
    };
  }, [usesHeroBrand, pathname]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const from = flipFromLeft.current;
    flipFromLeft.current = null;
    if (!nav || from == null) return;

    const dx = from - nav.getBoundingClientRect().left;
    if (Math.abs(dx) < 1) return;

    nav.style.transition = "none";
    nav.style.transform = `translateX(${dx}px)`;
    void nav.offsetWidth;
    nav.style.transition = "transform 300ms var(--ease-brand)";
    nav.style.transform = "translateX(0)";

    const clear = () => {
      nav.style.transition = "";
      nav.style.transform = "";
    };
    nav.addEventListener("transitionend", clear, { once: true });
    return () => {
      nav.removeEventListener("transitionend", clear);
      clear();
    };
  }, [showHeaderBrand]);

  return (
    <header className="border-b border-line bg-background/90 backdrop-blur-md">
      <div
        className={`site-header-inner mx-auto flex h-14 max-w-6xl items-center px-5 sm:h-16 sm:px-8 ${
          showHeaderBrand ? "site-header-inner--brand-visible" : ""
        }`}
      >
        <Link
          href="/"
          aria-label="Causey home — browse competition types"
          aria-hidden={showHeaderBrand ? undefined : true}
          tabIndex={showHeaderBrand ? undefined : -1}
          className={`site-header-brand ${
            showHeaderBrand ? "site-header-brand--visible" : ""
          } rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red`}
        >
          <CauseyLogo size="md" />
        </Link>
        <nav
          ref={navRef}
          className={`site-header-nav flex min-w-0 items-center gap-3 sm:min-w-max sm:gap-6 ${
            showHeaderBrand ? "sm:pr-2.5" : ""
          }`}
          aria-label="Primary"
        >
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
