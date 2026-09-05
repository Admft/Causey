import { NextResponse } from "next/server";
import { PROFILE_SELECT } from "@/lib/auth/session";
import {
  mobileAppAccess,
  type MobileAppAccess,
} from "@/lib/auth/mobile-access";
import type { Profile } from "@/lib/auth/types";
import {
  accessTokenFromRequest,
  createSupabaseClientWithAccessToken,
} from "@/lib/supabase/access-token";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export type MobileAuth =
  | {
      ok: true;
      user: User;
      profile: Profile;
      supabase: SupabaseClient;
      access: MobileAppAccess;
    }
  | { ok: false; status: number; error: string };

function asProfile(row: Record<string, unknown>): Profile {
  return {
    ...(row as unknown as Profile),
    interests: Array.isArray(row.interests) ? row.interests : [],
    preferred_competition_category:
      (row.preferred_competition_category as Profile["preferred_competition_category"]) ??
      null,
    grade: typeof row.grade === "number" ? row.grade : null,
    credential_ids:
      row.credential_ids &&
      typeof row.credential_ids === "object" &&
      !Array.isArray(row.credential_ids)
        ? (row.credential_ids as Profile["credential_ids"])
        : {},
  };
}

export async function getMobileAuth(request: Request): Promise<MobileAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      ok: false,
      status: 503,
      error: "Accounts are unavailable in this build.",
    };
  }

  const token = accessTokenFromRequest(request);
  if (!token) {
    return { ok: false, status: 401, error: "Sign in to continue." };
  }

  const supabase = createSupabaseClientWithAccessToken(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Sign in to continue." };
  }

  const { data: row, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || !row) {
    return {
      ok: false,
      status: 403,
      error: "Complete your profile on the website first.",
    };
  }

  const profile = asProfile(row as Record<string, unknown>);
  return {
    ok: true,
    user: data.user,
    profile,
    supabase,
    access: mobileAppAccess(profile),
  };
}

export function mobileAuthError(auth: Extract<MobileAuth, { ok: false }>) {
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}

export function mobilePublicProfile(profile: Profile, email: string | null) {
  return {
    id: profile.id,
    role: profile.role,
    display_name: profile.display_name,
    zip: profile.zip,
    email,
  };
}
