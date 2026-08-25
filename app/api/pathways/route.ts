import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/data";
import { walkPathways } from "@/lib/qualification";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  // "series:<uuid>" or "competition:<uuid>"
  source: z
    .string()
    .regex(/^(series|competition):[0-9a-f-]{36}$/)
    .optional(),
  placement: z.coerce.number().int().positive().default(1),
});

/**
 * GET /api/pathways
 *   without ?source → picker options: series and competitions that unlock
 *   at least one pathway hop (1st-place walk). Empty-pathway events stay out.
 *   with ?source=series:<id>|competition:<id>&placement=N → the pathway walk.
 */
export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pathway query.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = getDataSource();

  if (!parsed.data.source) {
    const [series, competitions, rules] = await Promise.all([
      data.listSeries(),
      data.listPathwayCompetitionRefs(),
      data.listQualificationRules(),
    ]);
    const seriesById = new Map(series.map((s) => [s.id, s]));

    const seriesWithPathways = series.filter(
      (s) =>
        walkPathways({ series_id: s.id, placement: 1 }, rules, seriesById).length > 0
    );
    const competitionsWithPathways = competitions.filter(
      (c) =>
        walkPathways(
          { competition_id: c.id, series_id: c.series_id, placement: 1 },
          rules,
          seriesById
        ).length > 0
    );

    return NextResponse.json({
      series: seriesWithPathways,
      competitions: competitionsWithPathways,
    });
  }

  const [kind, id] = parsed.data.source.split(":");
  const [rules, seriesList, competitions] = await Promise.all([
    data.listQualificationRules(),
    data.listSeries(),
    data.listPathwayCompetitionRefs(),
  ]);
  const seriesById = new Map(seriesList.map((s) => [s.id, s]));

  let start;
  let startLabel: string;
  if (kind === "series") {
    const series = seriesById.get(id);
    if (!series) {
      return NextResponse.json({ error: "Unknown series." }, { status: 404 });
    }
    start = { series_id: id, placement: parsed.data.placement };
    startLabel = series.name;
  } else {
    const competition = competitions.find((c) => c.id === id);
    if (!competition) {
      return NextResponse.json({ error: "Unknown competition." }, { status: 404 });
    }
    // A competition inherits rules keyed on its series plus rules keyed
    // directly on the event.
    start = {
      competition_id: id,
      series_id: competition.series_id,
      placement: parsed.data.placement,
    };
    startLabel = competition.name;
  }

  const nodes = walkPathways(start, rules, seriesById);
  return NextResponse.json({ startLabel, placement: parsed.data.placement, nodes });
}
