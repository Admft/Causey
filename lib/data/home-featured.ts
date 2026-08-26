import "server-only";

import { getRequestDataSource } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/data/portal";
import {
  buildCompetitionResult,
  parseCompetitionRow,
} from "@/lib/data/search";
import type { CompetitionResult } from "@/lib/data/types";
import {
  HOME_FEATURED_LIMIT,
  HOME_FEATURED_POOL,
  HOME_FEATURED_RADIUS_MILES,
  hasOrganizerCover,
  homeFeaturedCopy,
  pickHomeFeatured,
  type HomeFeaturedCopy,
  type HomeFeaturedMode,
} from "@/lib/home-featured";
import { todayIsoDate } from "@/lib/competition-timing";
import { SearchFiltersSchema } from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HomeFeaturedResult = {
  mode: HomeFeaturedMode;
  results: CompetitionResult[];
  copy: HomeFeaturedCopy;
  nearbyEmpty: boolean;
};

const PHOTO_FILTERS = SearchFiltersSchema.parse({
  category: "chess",
  timing: "upcoming",
  sort: "soonest",
  limit: HOME_FEATURED_POOL,
});

async function loadPhotoPool(): Promise<CompetitionResult[]> {
  if (!isSupabaseConfigured()) {
    const data = await getRequestDataSource();
    const page = await data.searchCompetitions(PHOTO_FILTERS);
    return page.results.filter((row) => hasOrganizerCover(row.image_url));
  }

  const supabase = await createServerSupabaseClient();
  const today = todayIsoDate();
  const { data, error } = await supabase
    .from("competitions")
    .select("*, sections(*), series(*)")
    .eq("status", "published")
    .eq("category", "chess")
    .is("canonical_id", null)
    .not("image_url", "is", null)
    .or(`end_date.gte.${today},and(end_date.is.null,start_date.gte.${today})`)
    .order("start_date", { ascending: true })
    .limit(HOME_FEATURED_POOL);
  if (error || !data) return [];

  const results: CompetitionResult[] = [];
  for (const row of data) {
    const parsed = parseCompetitionRow(row as Record<string, unknown>);
    if (!parsed) continue;
    if (!hasOrganizerCover(parsed.competition.image_url)) continue;
    const hit = buildCompetitionResult({
      competition: parsed.competition,
      sections: parsed.sections,
      series: parsed.series,
      distance_miles: null,
      filters: PHOTO_FILTERS,
    });
    if (hit) results.push(hit);
  }
  return results;
}

export async function getHomeFeaturedCompetitions(
  zip: string | null
): Promise<HomeFeaturedResult> {
  const dayIso = todayIsoDate();

  if (zip) {
    const data = await getRequestDataSource();
    const origin = await data.getZip(zip);
    if (origin) {
      const page = await data.searchCompetitions(
        SearchFiltersSchema.parse({
          category: "chess",
          zip,
          radius_miles: HOME_FEATURED_RADIUS_MILES,
          timing: "upcoming",
          sort: "soonest",
          limit: HOME_FEATURED_POOL,
        })
      );
      const nearby = pickHomeFeatured(page.results, "nearby", dayIso);
      if (nearby.length > 0) {
        return {
          mode: "nearby",
          results: nearby,
          copy: homeFeaturedCopy("nearby", zip),
          nearbyEmpty: false,
        };
      }
    }
  }

  const photos = pickHomeFeatured(await loadPhotoPool(), "photos", dayIso);
  return {
    mode: "photos",
    results: photos.slice(0, HOME_FEATURED_LIMIT),
    copy: homeFeaturedCopy("photos", null),
    nearbyEmpty: Boolean(zip),
  };
}
