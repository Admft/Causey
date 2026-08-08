"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PrimaryNav } from "@/components/PrimaryNav";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [homeHeroBrandIsPast, setHomeHeroBrandIsPast] = useState(false);
  const showHeaderBrand = !isHome || homeHeroBrandIsPast;

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const heroBrand = document.querySelector("[data-home-hero-brand]");
    if (!heroBrand) {
      setHomeHeroBrandIsPast(true);
      return;
    }

    setHomeHeroBrandIsPast(false);
    const observer = new IntersectionObserver(
      ([entry]) => setHomeHeroBrandIsPast(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(heroBrand);
    return () => observer.disconnect();
  }, [isHome]);

  return (
    <header className="border-b border-line bg-background/90 backdrop-blur-md">
      <div
        className={`site-header-inner mx-auto flex h-14 max-w-6xl items-center gap-3 px-5 sm:h-16 sm:gap-6 sm:px-8 ${
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
          }`}
        >
          <CauseyLogo size="md" />
        </Link>
        <nav
          className="site-header-nav flex min-w-0 items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          <PrimaryNav />
        </nav>
        <div className="site-header-auth flex min-w-0 items-center">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
