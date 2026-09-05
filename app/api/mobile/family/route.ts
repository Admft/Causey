import { NextResponse } from "next/server";
import {
  getMobileAuth,
  mobileAuthError,
  mobilePublicProfile,
} from "@/lib/auth/mobile-request";
import { serializeFamilyDesk } from "@/lib/data/mobile-family";
import {
  getChildrenWithEvents,
  getPendingChildRequestCount,
} from "@/lib/data/portal";
import { todayIsoInTimeZone } from "@/lib/competition-timing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getMobileAuth(request);
  if (!auth.ok) return mobileAuthError(auth);
  if (!auth.access.allowed) {
    return NextResponse.json(
      {
        error: auth.access.message,
        access: auth.access,
      },
      { status: 403 }
    );
  }

  const [children, pendingCount] = await Promise.all([
    getChildrenWithEvents(auth.user.id, auth.supabase),
    getPendingChildRequestCount(auth.user.id, auth.supabase),
  ]);
  const today = todayIsoInTimeZone("America/Chicago");

  return NextResponse.json({
    profile: mobilePublicProfile(auth.profile, auth.user.email ?? null),
    access: auth.access,
    pending_link_count: pendingCount,
    children: serializeFamilyDesk(children, today),
  });
}
