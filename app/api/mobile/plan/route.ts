import { NextResponse } from "next/server";
import {
  getMobileAuth,
  mobileAuthError,
  mobilePublicProfile,
} from "@/lib/auth/mobile-request";
import { todayIsoInTimeZone } from "@/lib/competition-timing";
import { getMobilePlan } from "@/lib/data/mobile-plan";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      { error: auth.access.message, access: auth.access },
      { status: 403 }
    );
  }

  const plan = await getMobilePlan(
    auth.user.id,
    auth.supabase,
    todayIsoInTimeZone("America/Chicago")
  );

  return NextResponse.json({
    profile: mobilePublicProfile(auth.profile, auth.user.email ?? null),
    access: auth.access,
    ...plan,
  });
}
