import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { DEFAULT_SEARCH_LIMIT, SearchFiltersSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/competitions — search published competitions.
 * Query params mirror SearchFiltersSchema (q, zip, radius_miles, state,
 * grade_band, rating_band, max_fee_cents, date_from, date_to, limit, offset).
 * Returns { results, total, limit, offset, count } — tiles page in chunks
 * (default limit 20) so the first load stays fast.
 */
export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(
    [...request.nextUrl.searchParams.entries()].filter(([, v]) => v !== "")
  );

  const parsed = SearchFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search filters.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 }
    );
  }

  const data = getDataSource();
  const filters = {
    ...parsed.data,
    limit: parsed.data.limit ?? DEFAULT_SEARCH_LIMIT,
    offset: parsed.data.offset ?? 0,
  };

  // A zip the lookup table doesn't know is a user-fixable problem — report
  // it specifically instead of silently searching the whole country.
  if (filters.zip) {
    const zipRow = await data.getZip(filters.zip);
    if (!zipRow) {
      return NextResponse.json(
        {
          error: `Zip ${filters.zip} isn't in our lookup table. If you're on mock data, only the sample zips work — run DATA_SOURCE=supabase after npm run seed:zips for full US coverage.`,
          code: "zip_not_found",
        },
        { status: 422 }
      );
    }
  }

  const page = await data.searchCompetitions(filters);
  return NextResponse.json({
    results: page.results,
    total: page.total,
    limit: page.limit,
    offset: page.offset,
    count: page.results.length,
  });
}
