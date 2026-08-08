import Image from "next/image";
import { LIVE_SOURCES, SOON_SOURCES } from "@/lib/tournament-sources";

/**
 * Advertises where Causey pulls chess tournaments from — live scrapers first,
 * then hubs and affiliate calendars on the roadmap. One job: provenance trust.
 */
export function TournamentSources() {
  return (
    <section
      className="home-band band-join band-join--soft bg-surface-soft"
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
          <SourceColumn title="Adding soon" sources={SOON_SOURCES} soon />
        </div>
      </div>
    </section>
  );
}

function SourceColumn({
  title,
  sources,
  soon = false,
}: {
  title: string;
  sources: typeof LIVE_SOURCES;
  soon?: boolean;
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
                  {soon ? (
                    <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                      Soon
                    </span>
                  ) : null}
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
