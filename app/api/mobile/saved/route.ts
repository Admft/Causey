import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import {
  isCompetitionEnded,
  todayIsoInTimeZone,
} from "@/lib/competition-timing";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  competitionId: z.string().uuid(),
});

type CompetitionJoin = {
  slug: string;
  name: string;
  category: string;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
};

type SavedRow = {
  competition_id: string;
  competitions: CompetitionJoin | CompetitionJoin[] | null;
};

function asCompetition(
  value: SavedRow["competitions"]
): CompetitionJoin | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function upcomingFirst(
  a: { start_date: string; end_date: string | null },
  b: { start_date: string; end_date: string | null },
  today: string
) {
  const aEnded = isCompetitionEnded(a, today) ? 1 : 0;
  const bEnded = isCompetitionEnded(b, today) ? 1 : 0;
  if (aEnded !== bEnded) return aEnded - bEnded;
  return a.start_date.localeCompare(b.start_date);
}

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const { data, error } = await auth.supabase
    .from("saved_competitions")
    .select(
      "competition_id, competitions(slug, name, category, city, state, start_date, end_date)"
    )
    .eq("user_id", auth.user.id);
  if (error) {
    return NextResponse.json(
      { error: "Could not load saved listings." },
      { status: 500 }
    );
  }

  const today = todayIsoInTimeZone("America/Chicago");
  const saved = ((data ?? []) as SavedRow[])
    .flatMap((row) => {
      const competition = asCompetition(row.competitions);
      if (!competition) return [];
      return [
        {
          competition_id: row.competition_id,
          slug: competition.slug,
          name: competition.name,
          category: competition.category,
          city: competition.city,
          state: competition.state,
          start_date: competition.start_date,
          end_date: competition.end_date,
        },
      ];
    })
    .sort((a, b) => upcomingFirst(a, b, today));

  return NextResponse.json({ saved });
}

export async function POST(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a listing to save." },
      { status: 400 }
    );
  }

  const competitionId = parsed.data.competitionId;
  const { data: existing, error: lookupError } = await auth.supabase
    .from("saved_competitions")
    .select("competition_id")
    .eq("user_id", auth.user.id)
    .eq("competition_id", competitionId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json(
      { error: "Could not update that bookmark." },
      { status: 500 }
    );
  }

  if (existing) {
    const { error: delError } = await auth.supabase
      .from("saved_competitions")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("competition_id", competitionId);
    if (delError) {
      return NextResponse.json(
        { error: "Could not remove that bookmark." },
        { status: 500 }
      );
    }
    return NextResponse.json({ saved: false });
  }

  const { error: insError } = await auth.supabase
    .from("saved_competitions")
    .insert({ user_id: auth.user.id, competition_id: competitionId });
  if (insError) {
    return NextResponse.json(
      { error: "Could not save that listing." },
      { status: 400 }
    );
  }
  return NextResponse.json({ saved: true });
}
