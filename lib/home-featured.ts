import { discoveryCategoryHref } from "@/lib/category-discovery";
import { organizerCoverUrl } from "@/lib/cover-url";

export const HOME_FEATURED_LIMIT = 6;
export const HOME_FEATURED_RADIUS_MILES = 75;
export const HOME_FEATURED_POOL = 48;

export type HomeFeaturedMode = "nearby" | "photos";

export type HomeFeaturedCopy = {
  heading: string;
  blurb: string;
  searchHref: string;
  searchLabel: string;
};

export function hasOrganizerCover(
  imageUrl: string | null | undefined
): boolean {
  return organizerCoverUrl(imageUrl) !== null;
}

/** Stable daily shuffle so a refresh does not reshuffle the homepage strip. */
export function shuffleWithDaySeed<T>(items: readonly T[], dayIso: string): T[] {
  const out = [...items];
  let seed = 0;
  for (let i = 0; i < dayIso.length; i += 1) {
    seed = (seed * 31 + dayIso.charCodeAt(i)) >>> 0;
  }
  if (seed === 0) seed = 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const current = out[i];
    const swap = out[j];
    if (current === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = current;
  }
  return out;
}

export function pickHomeFeatured<T extends { image_url?: string | null }>(
  pool: readonly T[],
  mode: HomeFeaturedMode,
  dayIso: string,
  limit = HOME_FEATURED_LIMIT
): T[] {
  const withPhotos = pool.filter((row) => hasOrganizerCover(row.image_url));
  if (mode === "photos") {
    return shuffleWithDaySeed(withPhotos, dayIso).slice(0, limit);
  }
  return withPhotos.slice(0, limit);
}

export function homeFeaturedCopy(
  mode: HomeFeaturedMode,
  zip: string | null
): HomeFeaturedCopy {
  const searchLabel = "See more chess tournaments";
  if (mode === "nearby" && zip) {
    return {
      heading: `Browse tournaments near ${zip}`,
      blurb: `Upcoming chess listings within about ${HOME_FEATURED_RADIUS_MILES} miles of the zip on your account. Coverage is still incomplete.`,
      searchHref: discoveryCategoryHref("chess", {
        zip,
        radius: String(HOME_FEATURED_RADIUS_MILES),
      }),
      searchLabel,
    };
  }
  return {
    heading: "Browse tournaments",
    blurb:
      "A sample of upcoming chess listings. Coverage is still incomplete.",
    searchHref: discoveryCategoryHref("chess"),
    searchLabel,
  };
}
