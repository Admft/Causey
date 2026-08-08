"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { STATE_AFFILIATES } from "@/lib/state-affiliates";
import { LIVE_SOURCES } from "@/lib/tournament-sources";

/**
 * Homepage coverage story as one progress path (design system §8.11): what is
 * indexed, what is being added, what is planned — replacing the old pair of
 * adjacent "sources" and "roadmap" bands that read as two unrelated sections.
 * The scroll-triggered line draw is the section's ONE motion moment: it shows
 * how far the indexing work has actually gotten. Text is never hidden by the
 * reveal; only the line and node fills animate, and reduced motion skips it.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const UPCOMING_COMPETITION_TYPES = [
  {
    name: "STEM",
    description: "Science, technology, engineering, and mathematics competitions.",
  },
  {
    name: "Debate",
    description: "Speech, debate, and public-speaking competitions.",
  },
  {
    name: "Arts",
    description: "Visual, performing, and creative arts competitions.",
  },
  {
    name: "Writing",
    description: "Essay, journalism, poetry, and creative writing competitions.",
  },
];

// Tier-ordered preview of the affiliate work queue. Texas is skipped because
// TCA is already a live feed in step one.
const PREVIEW_AFFILIATES = STATE_AFFILIATES.filter(
  (affiliate) => affiliate.region !== "Texas"
).slice(0, 6);

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
          What Causey indexes today, and what gets added next
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted">
          There is no public API for scholastic tournament calendars, so Causey
          indexes the hubs organizers already publish to. Chess comes first;
          the rest of the work has a public order.
        </p>

        <ol ref={pathRef} className="coverage-path mt-10">
          <li className="coverage-step coverage-step--reached">
            <span
              aria-hidden="true"
              className="coverage-node coverage-node--done"
            />
            <p className="text-xs font-semibold text-brand-red">Indexed today</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Chess tournaments from six published calendars
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
              className="coverage-node coverage-node--active"
            />
            <p className="text-xs font-semibold text-brand-red">Being added</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Every USCF state affiliate calendar
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Texas is already indexed. The remaining state affiliates are being
              added in order of tournament volume.
            </p>
            <p className="mt-3 text-sm font-semibold text-muted-strong">
              {PREVIEW_AFFILIATES.map((affiliate) => affiliate.region).join(" · ")}
            </p>
            <Link
              href="/sources/state-affiliates"
              className="mt-3 inline-flex text-sm font-semibold text-brand-red hover:text-brand-red-hover"
            >
              See all {STATE_AFFILIATES.length} state affiliates →
            </Link>
          </li>

          <li className="coverage-step">
            <span
              aria-hidden="true"
              className="coverage-node coverage-node--planned"
            />
            <p className="text-xs font-semibold text-muted">Planned</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Four more competition types
            </h3>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {UPCOMING_COMPETITION_TYPES.map((type) => (
                <li key={type.name}>
                  <p className="text-sm font-semibold text-foreground">
                    {type.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{type.description}</p>
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
