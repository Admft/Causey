import Link from "next/link";
import { CategoryGraphic } from "@/components/CategoryGraphic";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  DISCOVERY_CATEGORIES,
  type DiscoveryCategory,
} from "@/lib/category-discovery";
import { LIVE_SOURCES } from "@/lib/tournament-sources";

/**
 * Homepage coverage as the five-directory set the hero only hints at. Each
 * card is one directory: the same section graphic the search picker uses, a one-line
 * depth statement, and a bar that makes "chess is the broadest" visible
 * instead of asserted. The honesty lives on the card as a fact, not in a
 * paragraph. Cards link into their directory, where per-source status and the
 * outbound link already live.
 */

type CoverageCard = {
  id: DiscoveryCategory;
  label: string;
  href: string;
  indexed: number;
  restricted: number;
  /** One sentence that is only true of this directory. */
  depth: string;
};

const MAX_SOURCES = 6;

const COVERAGE_CARDS: readonly CoverageCard[] = DISCOVERY_CATEGORIES.map(
  (category) => {
    // Chess metadata carries a single pointer row for its six live feeds, so
    // the count comes from the feed list itself.
    const indexed =
      category.id === "chess"
        ? LIVE_SOURCES.length
        : category.activeSources.length;
    const restricted = category.referenceSources.length;
    const depth: Record<string, string> = {
      chess: "Six live calendars, from local clubs to FIDE.",
      debate: "UIL invitationals with explicit speech or debate.",
      stem: "Three contests; VEX and other big directories stay link-only.",
      arts: "VASE, theatre, and marching band state dates.",
      writing: "Two awards; one cycle has already closed.",
    };
    return {
      id: category.id,
      label: category.label,
      href: category.href,
      indexed,
      restricted,
      depth: depth[category.id] ?? "",
    };
  }
);

function CoverageBar({ indexed }: { indexed: number }) {
  return (
    <span
      role="img"
      aria-label={`${indexed} indexed ${
        indexed === 1 ? "source" : "sources"
      } of ${MAX_SOURCES} shown`}
      className="flex items-end gap-1"
    >
      {Array.from({ length: MAX_SOURCES }, (_, index) => {
        const filled = index < indexed;
        return (
          <span
            key={index}
            aria-hidden="true"
            className={`w-1.5 rounded-sm ${
              filled ? "bg-brand-red" : "bg-line"
            }`}
            style={{ height: `${0.5 + index * 0.375}rem` }}
          />
        );
      })}
    </span>
  );
}

export function HomeCoveragePath() {
  return (
    <section
      id="coverage"
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="coverage-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2
            id="coverage-heading"
            className="max-w-[16ch] font-display text-display-sm tracking-tight text-foreground"
          >
            Five directories, one honest map
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted">
            There is no public API for scholastic competition calendars, so
            Causey indexes the official pages organizers already publish. How
            deep each directory goes is different, and it is printed on the
            card.
          </p>
        </div>

        <ul
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Directories Causey indexes"
        >
          {COVERAGE_CARDS.map((card, index) => (
            <li key={card.id}>
              <ScrollReveal delay={index * 60} className="h-full">
                <Link
                  href={card.href}
                  className="card-lift group flex h-full min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand-red/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-soft transition-colors group-hover:border-brand-red/40">
                      <CategoryGraphic
                        category={card.id}
                        className="h-9 w-9"
                        sizes="36px"
                      />
                    </span>
                    <CoverageBar indexed={card.indexed} />
                  </div>
                  <h3 className="mt-4 text-lead font-bold text-foreground transition-colors group-hover:text-brand-red">
                    {card.label}
                    <span
                      aria-hidden="true"
                      className="nudge-x ml-2 text-sm text-muted group-hover:text-brand-red"
                    >
                      →
                    </span>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{card.depth}</p>
                  <p className="mt-auto pt-4 text-xs font-semibold text-muted-strong">
                    {card.indexed} indexed
                    {card.restricted > 0 ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {card.restricted} link-only
                      </span>
                    ) : null}
                  </p>
                </Link>
              </ScrollReveal>
            </li>
          ))}

          {/* Sixth cell: the honesty statement, given the same weight as a
              directory instead of buried in prose. Soft fill, no border, so
              it reads as the quiet note beside the five linked cards. */}
          <li>
            <ScrollReveal delay={COVERAGE_CARDS.length * 60} className="h-full">
              <div className="flex h-full min-w-0 flex-col rounded-2xl bg-surface-soft p-5">
                <h3 className="text-lead font-bold text-foreground">
                  Some stay links, not listings
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Tabroom, FIRST, Scholastic, and others prohibit automated
                  indexing or have not granted it. Causey links to them from
                  each directory instead of copying their listings, so those
                  searches return fewer events.
                </p>
                <p className="mt-auto pt-4 text-xs font-semibold text-muted-strong">
                  14 directories, linked not copied
                </p>
              </div>
            </ScrollReveal>
          </li>
        </ul>
      </div>
    </section>
  );
}
