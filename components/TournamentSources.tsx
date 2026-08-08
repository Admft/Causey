import Image from "next/image";
import Link from "next/link";
import { STATE_AFFILIATES } from "@/lib/state-affiliates";
import { LIVE_SOURCES } from "@/lib/tournament-sources";

/**
 * Advertises where Causey pulls chess tournaments from — live scrapers first,
 * then the state-affiliate calendars on the roadmap. One job: provenance trust.
 * The two columns take different shapes on purpose: logo rows for live feeds,
 * a compact text preview for affiliates, so the band doesn't read as one
 * template stamped twice.
 */
// Tier-ordered preview of the affiliate roadmap. Texas is skipped because TCA
// is already a live scraper in the other column.
const PREVIEW_AFFILIATES = STATE_AFFILIATES.filter(
  (affiliate) => affiliate.region !== "Texas"
).slice(0, 6);

export function TournamentSources() {
  return (
    <section
      className="home-band band-join band-join--surface bg-surface"
      aria-labelledby="sources-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id="sources-heading"
          className="max-w-[22ch] font-display text-display-sm font-bold tracking-tight text-foreground"
        >
          Where these tournaments come from
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted">
          There is no public API for upcoming over-the-board calendars. Causey
          indexes the hubs organizers already publish to — starting with the
          national feeds below, then registration sites and every USCF state
          affiliate.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <SourceColumn title="Indexing now" sources={LIVE_SOURCES} />
          <AffiliatePreviewColumn />
        </div>
      </div>
    </section>
  );
}

function SourceColumn({
  title,
  sources,
}: {
  title: string;
  sources: typeof LIVE_SOURCES;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-strong">{title}</h3>
      <ul className="mt-4 space-y-5">
        {sources.map((source) => {
          const external = source.href.startsWith("http");
          return (
            <li key={source.id} className="flex gap-3">
                <Image
                  src={source.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-lg"
                />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-2">
                  <a
                    href={source.href}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group inline-flex items-baseline gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-brand-red"
                  >
                    {source.name}
                    {external ? (
                      <span
                        aria-hidden="true"
                        className="nudge-x text-sm font-medium text-muted"
                      >
                        ↗
                      </span>
                    ) : null}
                  </a>
                </p>
                <p className="mt-0.5 max-w-md text-sm text-muted">{source.blurb}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AffiliatePreviewColumn() {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-strong">Adding soon</h3>
      <p className="mt-2 text-sm text-muted">
        Scrapers are in progress; none of these are indexed yet.
      </p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {PREVIEW_AFFILIATES.map((affiliate) => (
          <li key={affiliate.region} className="py-3">
            <p className="font-semibold text-foreground">{affiliate.region}</p>
            <p className="mt-0.5 text-sm text-muted">
              {affiliate.org}
              {affiliate.abbreviation ? ` (${affiliate.abbreviation})` : ""}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/sources/state-affiliates"
        className="mt-4 inline-flex text-sm font-semibold text-brand-red hover:text-brand-red-hover"
      >
        See all {STATE_AFFILIATES.length} state affiliates →
      </Link>
    </div>
  );
}
