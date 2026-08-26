"use client";

import { useEffect, useRef, useState } from "react";
import { HomeHeroMyTournaments } from "@/components/HomeHeroMyTournaments";
import { HomeHeroSearch } from "@/components/HomeHeroSearch";
import type { DiscoveryCategory } from "@/lib/category-discovery";
import {
  HOME_MY_TOURNAMENTS_PATH,
  type HomeMyTournamentsSummary,
} from "@/lib/home-my-tournaments";

type HeroTab = "find" | "mine";

function tabClass(active: boolean) {
  return active
    ? "flex min-h-11 flex-1 items-center justify-center rounded-xl bg-white px-2 text-sm font-semibold text-foreground shadow-sm"
    : "flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-sm font-semibold text-muted-strong transition-colors hover:text-foreground";
}

/**
 * Homepage search card: Find stays the directory form; My tournaments is a
 * preview of Going / RSVP / org events, or a sign-in return to this tab.
 */
export function HomeHeroCard({
  initialCategory = null,
  initialTab = "find",
  summary,
}: {
  initialCategory?: DiscoveryCategory | null;
  initialTab?: HeroTab;
  summary: HomeMyTournamentsSummary | null;
}) {
  const [tab, setTab] = useState<HeroTab>(initialTab);
  const cardRef = useRef<HTMLDivElement>(null);
  const attentionTimer = useRef(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stackedMq = window.matchMedia("(max-width: 47.999rem)");

    const shine = () => {
      if (reducedMq.matches) return;
      card.classList.remove("is-search-attention");
      void card.offsetWidth;
      card.classList.add("is-search-attention");
      window.clearTimeout(attentionTimer.current);
      attentionTimer.current = window.setTimeout(() => {
        card.classList.remove("is-search-attention");
      }, 1100);
    };

    const goToSearch = () => {
      setTab("find");
      const chrome = document.querySelector("[data-site-chrome]");
      const inset = Math.ceil(
        (chrome?.getBoundingClientRect().height ?? 96) + 12
      );
      card.style.scrollMarginTop = `${inset}px`;
      if (stackedMq.matches) {
        card.scrollIntoView({
          behavior: reducedMq.matches ? "auto" : "smooth",
          block: "start",
        });
      }
      shine();
      card.focus({ preventScroll: true });
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (!(event.target instanceof Element)) return;
      const href = event.target.closest("a[href]")?.getAttribute("href");
      if (href !== "#search" && href !== "/#search") return;
      if (window.location.pathname !== "/") return;
      event.preventDefault();
      if (window.location.hash !== "#search") {
        window.history.pushState(null, "", "#search");
      }
      goToSearch();
    };

    document.addEventListener("click", onClick, true);
    let frame = 0;
    if (window.location.hash === "#search") {
      frame = window.requestAnimationFrame(() => goToSearch());
    }
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(attentionTimer.current);
    };
  }, []);

  function showTab(next: HeroTab) {
    setTab(next);
    const url = next === "mine" ? HOME_MY_TOURNAMENTS_PATH : "/";
    window.history.replaceState(null, "", url);
  }

  return (
    <div
      id="search"
      ref={cardRef}
      tabIndex={-1}
      className="home-hero-search flex w-full min-w-0 flex-col rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-panel)] md:rounded-3xl md:p-6 md:shadow-[var(--shadow-card)]"
    >
      <div
        role="tablist"
        aria-label="Find or review tournaments"
        className="flex rounded-xl border border-line bg-surface-soft p-1"
      >
        <button
          type="button"
          role="tab"
          id="hero-tab-find"
          aria-selected={tab === "find"}
          aria-controls="hero-find-panel"
          className={tabClass(tab === "find")}
          onClick={() => showTab("find")}
        >
          <span className="md:hidden">Find</span>
          <span className="hidden md:inline">Find tournaments</span>
        </button>
        <button
          type="button"
          role="tab"
          id="hero-tab-mine"
          aria-selected={tab === "mine"}
          aria-controls="hero-mine-panel"
          className={tabClass(tab === "mine")}
          onClick={() => showTab("mine")}
        >
          My tournaments
        </button>
      </div>

      <div
        id="hero-find-panel"
        role="tabpanel"
        aria-labelledby="hero-tab-find"
        hidden={tab !== "find"}
        className="mt-4 md:mt-5"
      >
        <HomeHeroSearch initialCategory={initialCategory} />
      </div>
      <div
        id="hero-mine-panel"
        role="tabpanel"
        aria-labelledby="hero-tab-mine"
        hidden={tab !== "mine"}
        className="mt-4 md:mt-5"
      >
        <HomeHeroMyTournaments
          summary={summary}
          onSearchInstead={() => showTab("find")}
        />
      </div>
    </div>
  );
}
