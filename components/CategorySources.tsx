import {
  discoveryCategory,
  type DiscoveryCategory,
} from "@/lib/category-discovery";

function SourceList({
  title,
  sources,
}: {
  title: string;
  sources: readonly {
    name: string;
    href: string;
    note: string;
    status?: string;
  }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-strong">{title}</h3>
      {sources.length === 0 ? (
        <p className="mt-4 max-w-lg text-sm text-muted">
          No permitted source is currently feeding this category.
        </p>
      ) : (
        <ul className="mt-4 space-y-5">
          {sources.map((source) => {
            const external = source.href.startsWith("http");
            return (
              <li key={source.name} className="border-t border-line pt-4">
                <a
                  href={source.href}
                  {...(external
                    ? {
                        target: "_blank",
                        rel: "noopener noreferrer",
                        "aria-label": `${source.name} (opens in a new tab)`,
                      }
                    : {})}
                  className="group inline-flex items-baseline gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-brand-red"
                >
                  {source.name}
                  {external ? (
                    <span aria-hidden="true" className="nudge-x text-sm text-muted">
                      ↗
                    </span>
                  ) : null}
                </a>
                {source.status ? (
                  <p className="mt-1 text-xs font-semibold text-muted-strong">
                    Status: {source.status}
                  </p>
                ) : null}
                <p className="mt-1 max-w-lg text-sm text-muted">{source.note}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CategorySources({
  category,
}: {
  category: DiscoveryCategory;
}) {
  const definition = discoveryCategory(category);
  if (!definition) return null;

  return (
    <section
      className="home-band section-rule bg-surface"
      aria-labelledby={`${category}-sources-heading`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id={`${category}-sources-heading`}
          className="max-w-[22ch] font-display text-display-sm font-bold tracking-tight text-foreground"
        >
          Where these tournaments come from
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Each ingest source states whether its adapter is active or paused.
          Reference sources remain outbound links only because permission,
          terms, or source quality does not support automated indexing.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <SourceList
            title="Active indexed sources"
            sources={definition.activeSources}
          />
          <SourceList
            title="Reference links, not indexed"
            sources={definition.referenceSources}
          />
        </div>
      </div>
    </section>
  );
}
