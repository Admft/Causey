import { NextResponse } from "next/server";
import {
  getMobileAuth,
  mobileAuthError,
  mobilePublicProfile,
} from "@/lib/auth/mobile-request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);

  return NextResponse.json({
    profile: mobilePublicProfile(auth.profile, auth.user.email ?? null),
    access: auth.access,
  });
}
