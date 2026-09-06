import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { getMobileEventAttendance } from "@/lib/data/mobile-event-attendance";

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

  const attendance = await getMobileEventAttendance({
    supabase: auth.supabase,
    userId: auth.user.id,
    viewerRole: auth.profile.role,
    competitionId: parsed.data,
  });
  if (!attendance) {
    return NextResponse.json({ error: "Competition not found." }, { status: 404 });
  }
  return NextResponse.json(attendance);
}
