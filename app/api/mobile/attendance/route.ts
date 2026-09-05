import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { performMarkAttendance } from "@/lib/attendance-write";
import { getEventAttendance } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

const CompetitionIdSchema = z.string().uuid();

const MarkSchema = z.object({
  competitionId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum(["attended", "did_not_attend"]),
});

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

  const { data: canManage, error: manageError } = await auth.supabase.rpc(
    "can_manage_competition",
    { p_competition_id: parsed.data, p_profile_id: auth.user.id }
  );
  if (manageError) {
    return NextResponse.json(
      { error: "Could not verify attendance access. Try again." },
      { status: 503 }
    );
  }
  if (canManage !== true) {
    return NextResponse.json(
      { error: "Only competition staff can record attendance." },
      { status: 403 }
    );
  }

  const { data: competition } = await auth.supabase
    .from("competitions")
    .select("id, slug, name, start_date, end_date, city, state")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!competition) {
    return NextResponse.json(
      { error: "That competition is unavailable." },
      { status: 404 }
    );
  }

  const rows = await getEventAttendance(parsed.data, auth.supabase);

  return NextResponse.json({
    competition,
    entrants: rows
      .filter((row) => row.member_status !== "removed")
      .map((row) => ({
        profile_id: row.profile_id,
        display_name: row.display_name,
        status: row.status,
        section_name: row.section_name,
        origin_org_name: row.origin_org_name,
      })),
  });
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
  const parsed = MarkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid attendance status." },
      { status: 400 }
    );
  }

  const result = await performMarkAttendance({
    supabase: auth.supabase,
    userId: auth.user.id,
    competitionId: parsed.data.competitionId,
    profileId: parsed.data.profileId,
    status: parsed.data.status,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
