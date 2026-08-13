"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import { LIVE_SOURCES } from "@/lib/tournament-sources";

/**
 * Homepage coverage story as one progress path (design system §8.11): which
 * directories are searchable, which one is deepest, and which sources stay
 * reference-only. The scroll-triggered line draw is the section's ONE motion
 * moment: it shows how far the indexing work has actually gotten. Text is
 * never hidden by the reveal; only the line and node fills animate, and
 * reduced motion skips it.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Restricted directories that remain outbound references across categories,
// taken from the governed source metadata rather than restated by hand.
const REFERENCE_ONLY_SOURCES = DISCOVERY_CATEGORIES.flatMap((category) =>
  category.referenceSources.map((source) => ({
    category: category.label,
    name: source.name,
  }))
);

function activeSourceSummary(categoryId: string): string {
  if (categoryId === "chess") {
    return LIVE_SOURCES.map((source) => source.name).join(", ");
  }
  const definition = DISCOVERY_CATEGORIES.find(
    (category) => category.id === categoryId
  );
  return (
    definition?.activeSources.map((source) => source.name).join(", ") ?? ""
  );
}

export function HomeCoveragePath() {
  const pathRef = useRef<HTMLOListElement>(null);

  useIsomorphicLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Set the pre-draw state before first paint so there is no flash of the
    // finished path; the observer then plays the draw once, on entry.
    path.setAttribute("data-pending", "");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          path.setAttribute("data-revealed", "");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px", threshold: 0 }
    );
    observer.observe(path);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="coverage-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id="coverage-heading"
          className="max-w-[24ch] font-display text-display-sm font-bold tracking-tight text-foreground"
        >
          What Causey indexes today, and where coverage remains limited
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted">
          There is no single public API for scholastic competition calendars,
          so Causey indexes official pages organizers already publish to.
          Coverage varies sharply by category, and some well-known directories
          stay reference links until their organizers permit indexing.
        </p>

        <ol ref={pathRef} className="coverage-path mt-10">
          <li className="coverage-step coverage-step--reached">
            <span
              aria-hidden="true"
              className="coverage-node coverage-node--done"
            />
            <p className="text-xs font-semibold text-brand-red">
              Indexed today
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Five public competition directories
            </h3>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {DISCOVERY_CATEGORIES.map((category) => (
                <li key={category.id} className="py-3">
                  <Link
                    href={category.href}
                    className="text-sm font-semibold text-foreground transition-colors hover:text-brand-red"
                  >
                    {category.label}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {activeSourceSummary(category.id)}
                  </p>
                </li>
              ))}
            </ul>
          </li>

          <li className="coverage-step coverage-step--reached">
            <span
              aria-hidden="true"
              className="coverage-node coverage-node--done"
            />
            <p className="text-xs font-semibold text-brand-red">
              Broadest coverage
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Chess draws on six published calendars
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {LIVE_SOURCES.map((source) => {
                const external = source.href.startsWith("http");
                return (
                  <li key={source.id}>
                    <a
                      href={source.href}
                      {...(external
                        ? {
                            target: "_blank",
                            rel: "noopener noreferrer",
                            "aria-label": `${source.name} opens in a new tab`,
                          }
                        : {})}
                      className="group flex items-center gap-2.5"
                    >
                      <Image
                        src={source.logoUrl}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="h-7 w-7 shrink-0 rounded-lg"
                      />
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-brand-red">
                        {source.name}
                        {external ? (
                          <span
                            aria-hidden="true"
                            className="nudge-x ml-1 text-xs font-medium text-muted"
                          >
                            ↗
                          </span>
                        ) : null}
                      </span>
                    </a>
                    <p className="mt-1.5 text-xs text-muted">{source.blurb}</p>
                  </li>
                );
              })}
            </ul>
          </li>

          <li className="coverage-step">
            <span
              aria-hidden="true"
              className="coverage-node coverage-node--planned"
            />
            <p className="text-xs font-semibold text-muted">Limited coverage</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Restricted sources stay links, not listings
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Several directories organizers rely on prohibit automated indexing
              or have not granted it. Causey links to them instead of copying
              their listings, so those categories return fewer events.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {REFERENCE_ONLY_SOURCES.map((source) => (
                <li
                  key={`${source.category}-${source.name}`}
                  className="text-sm text-muted"
                >
                  <span className="font-semibold text-foreground">
                    {source.name}
                  </span>{" "}
                  <span className="text-xs">({source.category})</span>
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
