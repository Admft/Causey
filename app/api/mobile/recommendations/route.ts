import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import {
  performDismissRecommendation,
  performSendRecommendation,
} from "@/lib/recommendation-write";

export const dynamic = "force-dynamic";

const SendSchema = z.object({
  action: z.literal("send").optional(),
  competitionId: z.string().uuid(),
  eventSlug: z.string().trim().min(1).max(200).optional(),
  toProfileIds: z.array(z.string().uuid()).min(1).max(50),
  note: z.string().max(280).optional(),
});

const DismissSchema = z.object({
  action: z.literal("dismiss"),
  id: z.string().uuid(),
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

  const dismiss = DismissSchema.safeParse(json);
  if (dismiss.success) {
    const result = await performDismissRecommendation({
      supabase: auth.supabase,
      userId: auth.user.id,
      id: dismiss.data.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = SendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the recommendation details." },
      { status: 400 }
    );
  }

  const result = await performSendRecommendation({
    supabase: auth.supabase,
    userId: auth.user.id,
    competitionId: parsed.data.competitionId,
    toProfileIds: parsed.data.toProfileIds,
    note: parsed.data.note ?? "",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    sent: result.sent,
    toProfileIds: result.toProfileIds,
  });
}
