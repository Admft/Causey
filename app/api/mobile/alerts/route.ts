import { NextResponse } from "next/server";
import { z } from "zod";
import { actionErrorMessage } from "@/lib/actions/errors";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";

export const dynamic = "force-dynamic";

const NOTIFICATION_FIELDS = "id, kind, title, body, href, read_at, created_at";

const BodySchema = z
  .object({
    id: z.string().uuid().optional(),
    all: z.literal(true).optional(),
  })
  .refine((body) => body.all === true || Boolean(body.id));

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const [list, unread] = await Promise.all([
    auth.supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("recipient_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", auth.user.id)
      .is("read_at", null),
  ]);

  if (list.error || unread.error) {
    return NextResponse.json(
      { error: "Could not load alerts." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notifications: list.data ?? [],
    unread_count: unread.count ?? 0,
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
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the alert details." },
      { status: 400 }
    );
  }

  const readAt = new Date().toISOString();

  if (parsed.data.all === true) {
    const { error } = await auth.supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("recipient_id", auth.user.id)
      .is("read_at", null);
    if (error) {
      return NextResponse.json(
        { error: "Could not update notifications." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const id = parsed.data.id;
  if (!id) {
    return NextResponse.json(
      { error: "Check the alert details." },
      { status: 400 }
    );
  }

  const { count, error } = await auth.supabase
    .from("notifications")
    .update({ read_at: readAt }, { count: "exact" })
    .eq("id", id)
    .eq("recipient_id", auth.user.id);
  if (error || count !== 1) {
    return NextResponse.json(
      {
        error: actionErrorMessage(
          error,
          "That notification was not found or is no longer available.",
          "You can only update your own notifications."
        ),
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
