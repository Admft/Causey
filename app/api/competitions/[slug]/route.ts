import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";
import { walkPathways } from "@/lib/qualification";

export const dynamic = "force-dynamic";

/**
 * GET /api/competitions/[slug] — full event detail plus what winning it
 * unlocks (the qualification walk seeded with placement 1).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = getDataSource();

  const competition = await data.getCompetitionBySlug(slug);
  if (!competition) {
    return NextResponse.json(
      { error: `No published competition with slug "${slug}".` },
      { status: 404 }
    );
  }

  const [rules, series] = await Promise.all([
    data.listQualificationRules(),
    data.listSeries(),
  ]);
  const unlocks = walkPathways(
    { series_id: competition.series_id, competition_id: competition.id, placement: 1 },
    rules,
    new Map(series.map((s) => [s.id, s]))
  );

  return NextResponse.json({ competition, unlocks });
}
