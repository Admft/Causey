import { NextRequest, NextResponse } from "next/server";
import { getRequestDataSource } from "@/lib/data";
import { isDiscoveryCategory } from "@/lib/category-discovery";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";
import { DEFAULT_SEARCH_LIMIT, SearchFiltersSchema } from "@/lib/schemas";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

/**
 * GET /api/competitions — search published competitions.
 * Query params mirror SearchFiltersSchema (category, q, zip, radius_miles, state,
 * source, grade_band, rating_band, max_fee_cents, date_from, date_to,
 * timing, sort, limit, offset). Omit category to search every public directory
 * (chess, debate, STEM, arts, writing). timing defaults to upcoming (hides ended);
 * sort defaults to popular, with soonest available as an explicit option.
 * Returns { results, total, limit, offset, count } — tiles page in chunks
 * (default limit 20) so the first load stays fast.
 */
export async function GET(request: NextRequest) {
  const raw: Record<string, string> = Object.fromEntries(
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
  if (parsed.data.category && !isDiscoveryCategory(parsed.data.category)) {
    return NextResponse.json(
      { error: "That competition type does not have a public directory." },
      { status: 400 }
    );
  }

  const allowed = await consumeRateLimit(
    "search",
    await hashedRequestActorKey(null, request.headers),
    request.headers
  );
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const data = await getRequestDataSource();
  const filters = {
    ...parsed.data,
    limit: parsed.data.limit ?? DEFAULT_SEARCH_LIMIT,
    offset: parsed.data.offset ?? 0,
  };

  // An unknown zip is user-fixable; do not silently search the whole country.
  if (filters.zip) {
    const zipRow = await data.getZip(filters.zip);
    if (!zipRow) {
      return NextResponse.json(
        {
          error: `We don't recognize zip ${filters.zip} yet. Try a nearby zip or search by state.`,
          code: "zip_not_found",
        },
        { status: 422 }
      );
    }
  }

  try {
    const page = await data.searchCompetitions(filters);
    const hasSession = request.cookies
      .getAll()
      .some((cookie) => cookie.name.includes("-auth-token"));
    return NextResponse.json(
      {
        results: page.results,
        total: page.total,
        limit: page.limit,
        offset: page.offset,
        count: page.results.length,
      },
      {
        headers: {
          "Cache-Control": hasSession
            ? "private, no-store"
            : "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    reportError(err, "GET /api/competitions");
    return NextResponse.json(
      {
        error: "We couldn’t run that search. Try again in a moment.",
      },
      { status: 500 }
    );
  }
}
