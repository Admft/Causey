import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import { LIVE_SOURCES } from "@/lib/tournament-sources";

/**
 * Homepage coverage lanes. The open ledger on the left is what search can
 * actually reach today, one tick per indexed source, so "chess is the broadest
 * directory" is visible instead of asserted. The closed panel on the right is
 * the other half of the same truth: directories Causey may not index. Names
 * stay plain text here; per-source status and the link out live on each
 * directory page, which is where the row title goes.
 */

type CoverageRow = {
  id: string;
  label: string;
  href: string;
  indexed: readonly string[];
  restricted: readonly string[];
};

const COVERAGE_ROWS: readonly CoverageRow[] = DISCOVERY_CATEGORIES.map(
  (category) => ({
    id: category.id,
    label: category.label,
    href: category.href,
    // Chess metadata carries a single pointer row for its six live feeds, so
    // the names and the count come from the feed list itself.
    indexed: (category.id === "chess"
      ? LIVE_SOURCES
      : category.activeSources
    ).map((source) => source.name),
    restricted: category.referenceSources.map((source) => source.name),
  })
);

const RESTRICTED_ROWS = COVERAGE_ROWS.filter(
  (row) => row.restricted.length > 0
);

/**
 * Separators trail their own name inside one flex item, so a wrapped run
 * never starts a line with an orphaned middot.
 */
function SourceNames({
  names,
  tone,
}: {
  names: readonly string[];
  tone: "indexed" | "restricted";
}) {
  return (
    <ul
      className={
        tone === "indexed"
          ? "flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-strong"
          : "flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted"
      }
    >
      {names.map((name, index) => (
        <li key={name} className="min-w-0">
          {name}
          {index < names.length - 1 ? (
            <span aria-hidden="true" className="ml-2 text-muted">
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * One mark per indexed source, right-aligned so the five rows compare at a
 * glance. The marks are inline-block rather than flex children: an empty
 * inline-block's baseline is its bottom margin edge in every engine, so the
 * bars sit on the row's text baseline without relying on flex baseline
 * synthesis, which Safari and Chrome have resolved differently.
 */
function SourceTally({ count }: { count: number }) {
  return (
    <span className="whitespace-nowrap">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="ml-1 inline-block h-3 w-0.5 bg-brand-red"
        />
      ))}
      <span className="sr-only">
        {count} indexed {count === 1 ? "source" : "sources"}
      </span>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <h2
            id="coverage-heading"
            className="max-w-[14ch] font-display text-display-sm tracking-tight text-foreground"
          >
            What search covers today
          </h2>
          <p className="max-w-xl text-base text-muted">
            There is no public API for scholastic competition calendars, so
            Causey indexes the official pages organizers already publish. Chess
            draws on six of them. The other directories index fewer, and
            several well-known ones stay links instead of listings.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
          <ScrollReveal className="min-w-0 lg:pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Indexed now
              </h3>
              {/* Legend for the tick column: one mark per indexed source. */}
              <span className="text-2xs uppercase tracking-[0.1em] text-muted">
                Sources
              </span>
            </div>
            <ul
              className="mt-4 divide-y divide-line border-y border-line"
              aria-label="Directories Causey indexes"
            >
              {COVERAGE_ROWS.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <Link
                      href={row.href}
                      className="group text-lead font-bold text-foreground transition-colors hover:text-brand-red"
                    >
                      {row.label}
                      <span
                        aria-hidden="true"
                        className="nudge-x ml-2 text-sm text-muted group-hover:text-brand-red"
                      >
                        →
                      </span>
                    </Link>
                    <span className="sm:hidden">
                      <SourceTally count={row.indexed.length} />
                    </span>
                  </div>
                  <SourceNames names={row.indexed} tone="indexed" />
                  <span className="hidden sm:inline">
                    <SourceTally count={row.indexed.length} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Each directory page names every source it indexes, its current
              status, and a link out to it.
            </p>
          </ScrollReveal>

          <ScrollReveal className="min-w-0" delay={60}>
            <div className="rounded-2xl border border-line bg-surface-soft p-5 sm:p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-strong">
                Not indexed
              </h3>
              <p className="mt-3 text-sm text-muted">
                Some prohibit automated indexing. Others block ordinary
                requests, have not granted permission, or have not published
                complete dates. Causey links to them from each directory
                instead of copying their listings.
              </p>
              <dl className="mt-4 space-y-3 border-t border-line pt-4">
                {RESTRICTED_ROWS.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-4"
                  >
                    <dt className="text-xs font-semibold text-muted-strong">
                      {row.label}
                    </dt>
                    <dd className="min-w-0">
                      <SourceNames names={row.restricted} tone="restricted" />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
