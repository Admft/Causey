import { CompetitionCard } from "@/components/CompetitionCard";
import { HomeFeaturedSeeMore } from "@/components/HomeFeaturedSeeMore";
import type { HomeFeaturedResult } from "@/lib/data/home-featured";

export function HomeFeaturedSection({
  featured,
  zip,
}: {
  featured: HomeFeaturedResult;
  zip: string | null;
}) {
  if (featured.results.length === 0) return null;

  const blurb =
    featured.nearbyEmpty && zip
      ? `No upcoming chess listings within range of ${zip} yet. Showing a wider preview instead.`
      : featured.copy.blurb;

  return (
    <section
      id="featured"
      className="home-band band-join band-join--soft hidden bg-surface-soft md:block"
      aria-labelledby="featured-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 max-w-xl">
            <h2
              id="featured-heading"
              className="max-w-[16ch] font-display text-display-sm font-bold tracking-tight text-foreground"
            >
              {featured.copy.heading}
            </h2>
            <p className="mt-3 max-w-prose text-base text-muted">{blurb}</p>
          </div>
          <div className="self-start lg:self-auto">
            <HomeFeaturedSeeMore
              href={featured.copy.searchHref}
              label={featured.copy.searchLabel}
            />
          </div>
        </div>
        <div className="soft-scroll mt-8 snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-3">
          <ul className="flex w-max gap-4" aria-label="Listing preview">
            {featured.results.map((result) => (
              <li key={result.id} className="w-80 shrink-0 snap-start">
                <CompetitionCard
                  result={result}
                  layout="grid2"
                  sourceFallback={false}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
