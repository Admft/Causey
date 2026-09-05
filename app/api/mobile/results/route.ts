import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { getEventAttendance } from "@/lib/data/portal";
import { performRecordResult } from "@/lib/results-write";

export const dynamic = "force-dynamic";

const CompetitionIdSchema = z.string().uuid();

const RecordSchema = z.object({
  competitionId: z.string().uuid(),
  profileId: z.string().uuid(),
  eventSlug: z.string().min(1),
  sectionId: z.string().uuid().nullable(),
  placement: z.number().int().min(1).max(999).nullable(),
  awardLabel: z.string().trim().max(80).nullable(),
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
      { error: "Could not verify result recording access. Try again." },
      { status: 503 }
    );
  }
  if (canManage !== true) {
    return NextResponse.json(
      { error: "Only competition staff can record a result." },
      { status: 403 }
    );
  }

  const [{ data: competition }, rows, { data: sectionRows }] = await Promise.all(
    [
      auth.supabase
        .from("competitions")
        .select("id, slug, name, start_date, end_date, city, state")
        .eq("id", parsed.data)
        .maybeSingle(),
      getEventAttendance(parsed.data, auth.supabase),
      auth.supabase
        .from("sections")
        .select("id, name")
        .eq("competition_id", parsed.data)
        .order("name"),
    ]
  );
  if (!competition) {
    return NextResponse.json(
      { error: "That competition is unavailable." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    competition,
    sections: (sectionRows ?? []).map((section) => ({
      id: section.id as string,
      name: section.name as string,
    })),
    entrants: rows
      .filter((row) => row.member_status !== "removed")
      .map((row) => ({
        profile_id: row.profile_id,
        display_name: row.display_name,
        status: row.status,
        section_id: row.section_id,
        placement: row.placement,
        award_label: row.award_label,
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
  const parsed = RecordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the division, place, or award." },
      { status: 400 }
    );
  }

  const result = await performRecordResult({
    supabase: auth.supabase,
    userId: auth.user.id,
    competitionId: parsed.data.competitionId,
    profileId: parsed.data.profileId,
    eventSlug: parsed.data.eventSlug,
    sectionId: parsed.data.sectionId,
    placement: parsed.data.placement,
    awardLabel: parsed.data.awardLabel,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
