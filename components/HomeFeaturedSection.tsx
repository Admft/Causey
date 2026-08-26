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
        <h2
          id="featured-heading"
          className="max-w-[24ch] font-display text-display-sm font-bold tracking-tight text-foreground"
        >
          {featured.copy.heading}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted">
          {featured.nearbyEmpty && zip
            ? `No upcoming chess listings within range of ${zip} yet. Showing a sample instead.`
            : featured.copy.blurb}
        </p>
        <ul
          className={`mt-8 grid gap-4 ${
            featured.results.length === 1
              ? "max-w-sm grid-cols-1"
              : featured.results.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}
        >
          {featured.results.map((result) => (
            <li key={result.id}>
              <CompetitionCard result={result} layout="grid3" />
            </li>
          ))}
        </ul>
        <p className="section-rule mt-8 pt-6">
          <Link
            href={featured.copy.searchHref}
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            {featured.copy.searchLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}
