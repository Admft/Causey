import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { performSetRsvp } from "@/lib/rsvp-write";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  competitionId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum(["going", "not_going"]),
  eventSlug: z.string().trim().min(1).max(200).optional(),
});

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
    return NextResponse.json({ error: "Check the RSVP details." }, { status: 400 });
  }

  const result = await performSetRsvp({
    supabase: auth.supabase,
    userId: auth.user.id,
    competitionId: parsed.data.competitionId,
    profileId: parsed.data.profileId,
    status: parsed.data.status,
    eventSlug: parsed.data.eventSlug,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
