/**
 * Slug helpers for organizer-created rows. Same shape as the ingestion
 * slugs (ingestion/normalize.ts) so app and scraper slugs live in one
 * namespace — copied rather than imported so app code never pulls in
 * ingestion modules.
 */

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Competition slug: name + start date, e.g. spring-open-2026-04-11. */
export function slugify(name: string, startDate: string): string {
  return `${slugifyName(name)}-${startDate}`;
}

/** Collision retry: spring-open-2026-04-11-2, -3, … */
export function withSlugSuffix(slug: string, attempt: number): string {
  return `${slug}-${attempt}`;
}
