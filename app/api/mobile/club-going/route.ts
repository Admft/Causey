import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import {
  groupClubGoingRows,
  type ClubGoingRow,
} from "@/lib/data/portal";

export const dynamic = "force-dynamic";

const CompetitionIdSchema = z.string().uuid();

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const parsed = CompetitionIdSchema.safeParse(
    new URL(request.url).searchParams.get("competitionId")
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a competition." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("get_club_going", {
    p_competition_id: parsed.data,
  });
  if (error) {
    return NextResponse.json({ groups: [] });
  }

  return NextResponse.json({
    groups: groupClubGoingRows((data ?? []) as ClubGoingRow[]),
  });
}
