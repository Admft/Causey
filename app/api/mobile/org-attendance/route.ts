import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { getCoachOrgsWithAttendance } from "@/lib/data/portal";
import { performSetOrgAttendance } from "@/lib/org-attendance-write";

export const dynamic = "force-dynamic";

const CompetitionIdSchema = z.string().uuid();

const BodySchema = z.object({
  competitionId: z.string().uuid(),
  orgId: z.string().uuid(),
  attending: z.boolean(),
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

  const { data: competition } = await auth.supabase
    .from("competitions")
    .select("id, org_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!competition) {
    return NextResponse.json(
      { error: "That competition is unavailable." },
      { status: 400 }
    );
  }

  const orgs = await getCoachOrgsWithAttendance(
    auth.user.id,
    parsed.data,
    (competition.org_id as string | null) ?? null,
    auth.supabase
  );
  return NextResponse.json({ orgs });
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
      { error: "Choose a club, team, or school and whether it is going." },
      { status: 400 }
    );
  }

  const result = await performSetOrgAttendance({
    supabase: auth.supabase,
    userId: auth.user.id,
    orgId: parsed.data.orgId,
    competitionId: parsed.data.competitionId,
    attending: parsed.data.attending,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
