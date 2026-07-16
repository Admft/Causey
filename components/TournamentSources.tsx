import { LIVE_SOURCES, SOON_SOURCES } from "@/lib/tournament-sources";

/**
 * Advertises where Causey pulls chess tournaments from — live scrapers first,
 * then hubs and affiliate calendars on the roadmap. One job: provenance trust.
 */
export function TournamentSources() {
  return (
    <section className="section-rule bg-surface" aria-labelledby="sources-heading">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
        <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
          Data sources
        </p>
        <h2
          id="sources-heading"
          className="mt-2 max-w-[22ch] font-display text-display-sm font-bold tracking-tight text-foreground"
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
          <div>
            <h3 className="text-xs font-semibold text-muted-strong">Indexing now</h3>
            <ul className="mt-4 space-y-5">
              {LIVE_SOURCES.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-baseline gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-brand-red"
                  >
                    {source.name}
                    <span aria-hidden="true" className="text-sm font-medium text-muted">
                      ↗
                    </span>
                  </a>
                  <p className="mt-0.5 max-w-md text-sm text-muted">{source.blurb}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-strong">Adding soon</h3>
            <ul className="mt-4 space-y-5">
              {SOON_SOURCES.map((source) => (
                <li key={source.href}>
                  <p className="flex flex-wrap items-baseline gap-2">
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-baseline gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-brand-red"
                    >
                      {source.name}
                      <span aria-hidden="true" className="text-sm font-medium text-muted">
                        ↗
                      </span>
                    </a>
                    <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">
                      Soon
                    </span>
                  </p>
                  <p className="mt-0.5 max-w-md text-sm text-muted">{source.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
