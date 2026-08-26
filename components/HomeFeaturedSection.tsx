import Link from "next/link";
import { CompetitionCard } from "@/components/CompetitionCard";
import type { HomeFeaturedResult } from "@/lib/data/home-featured";

export function HomeFeaturedSection({
  featured,
  zip,
}: {
  featured: HomeFeaturedResult;
  zip: string | null;
}) {
  if (featured.results.length === 0) return null;

  return (
    <section
      id="featured"
      className="home-band band-join band-join--surface hidden bg-surface-soft md:block"
      aria-labelledby="featured-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="featured-heading"
              className="max-w-[24ch] font-display text-display-sm font-bold tracking-tight text-foreground"
            >
              {featured.copy.heading}
            </h2>
            <p className="mt-3 max-w-2xl text-base text-muted">
              {featured.nearbyEmpty && zip
                ? `No upcoming listings within range of ${zip} yet. Showing indexed events with organizer photos instead. ${featured.copy.blurb}`
                : featured.copy.blurb}
            </p>
          </div>
          <Link
            href={featured.copy.searchHref}
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            {featured.copy.searchLabel}
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-3 gap-4">
          {featured.results.map((result) => (
            <li key={result.id}>
              <CompetitionCard result={result} layout="grid3" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
