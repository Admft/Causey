import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAuth, mobileAuthError } from "@/lib/auth/mobile-request";
import { performJoinOrgWithCode } from "@/lib/join-write";
import {
  formatJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from "@/lib/org-codes";

export const dynamic = "force-dynamic";

const NO_MATCH = "That code didn’t match an organization.";
const PREVIEW_UNAVAILABLE = "We couldn’t check that team code.";

const BodySchema = z.object({
  code: z.string(),
});

type OrgPreview = {
  id: string;
  name: string;
  type: string;
  state: string | null;
};

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("code") ?? "";
  const code = normalizeJoinCode(raw);
  if (!isValidJoinCode(code)) {
    return NextResponse.json({ error: NO_MATCH }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: PREVIEW_UNAVAILABLE }, { status: 503 });
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: previews, error } = await supabase.rpc(
    "get_org_preview_by_code",
    { p_code: code }
  );
  if (error) {
    console.error("Could not load organization join preview:", error.code);
    return NextResponse.json({ error: PREVIEW_UNAVAILABLE }, { status: 503 });
  }

  const org = (previews?.[0] as OrgPreview | undefined) ?? null;
  // Fail closed: never invite someone to create an account unless this
  // anonymous preview resolved a real, current organization.
  if (!org) {
    return NextResponse.json({ error: NO_MATCH }, { status: 404 });
  }

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      type: org.type,
      state: org.state ?? null,
    },
    code: formatJoinCode(code),
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
    return NextResponse.json({ error: NO_MATCH }, { status: 400 });
  }

  const result = await performJoinOrgWithCode({
    supabase: auth.supabase,
    code: parsed.data.code,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    slug: result.slug,
    name: result.name,
  });
}
