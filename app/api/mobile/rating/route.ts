import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  competitionId: z.string().uuid(),
  score: z.union([z.number().int().min(1).max(10), z.null()]),
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
      { error: "Choose a difficulty from 1 to 10." },
      { status: 400 }
    );
  }

  if (parsed.data.score === null) {
    const { error } = await auth.supabase
      .from("competition_ratings")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("competition_id", parsed.data.competitionId);
    if (error) {
      return NextResponse.json(
        { error: "Could not remove that rating." },
        { status: 400 }
      );
    }
    return NextResponse.json({ score: null });
  }

  const { error } = await auth.supabase.from("competition_ratings").upsert(
    {
      user_id: auth.user.id,
      competition_id: parsed.data.competitionId,
      score: parsed.data.score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,competition_id" }
  );
  if (error) {
    return NextResponse.json(
      { error: "Could not save that rating." },
      { status: 400 }
    );
  }
  return NextResponse.json({ score: parsed.data.score });
}
