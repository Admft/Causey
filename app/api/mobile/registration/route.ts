import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { performSetExternalRegistration } from "@/lib/external-registration-write";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  competitionId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum(["registered", "not_registered"]),
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
    return NextResponse.json(
      { error: "Choose whether registration is complete." },
      { status: 400 }
    );
  }

  const result = await performSetExternalRegistration({
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
