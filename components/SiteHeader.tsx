"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PrimaryNav } from "@/components/PrimaryNav";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [homeHeroBrandIsPast, setHomeHeroBrandIsPast] = useState(false);
  const showHeaderBrand = !isHome || homeHeroBrandIsPast;
  const navRef = useRef<HTMLElement>(null);
  const flipFromLeft = useRef<number | null>(null);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const heroBrand = document.querySelector("[data-home-hero-brand]");
    if (!heroBrand) {
      // The observed home-hero element is an external DOM dependency.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHomeHeroBrandIsPast(true);
      return;
    }

    setHomeHeroBrandIsPast(false);

    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      const chrome = document.querySelector("[data-site-chrome]");
      const topInset = Math.ceil(chrome?.getBoundingClientRect().height ?? 56);
      observer = new IntersectionObserver(
        ([entry]) => {
          const past = !entry.isIntersecting;
          setHomeHeroBrandIsPast((current) => {
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
      observer.observe(heroBrand);
    };

    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, [isHome]);

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
          className={`site-header-nav flex min-w-0 items-center gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:min-w-max sm:overflow-visible sm:gap-6 [&::-webkit-scrollbar]:hidden ${
            showHeaderBrand ? "sm:pr-2.5" : ""
          }`}
          aria-label="Primary"
        >
          <PrimaryNav />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
