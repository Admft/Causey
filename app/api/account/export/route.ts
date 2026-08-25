import { NextResponse } from "next/server";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { getActiveChildren, getMyOrgs, getParentLinks } from "@/lib/data/portal";
import { getNotificationPreferences } from "@/lib/data/district";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profile not ready." }, { status: 409 });
  }

  const supabase = await createServerSupabaseClient();
  const [
    orgs,
    children,
    parents,
    preferences,
    saved,
    entrants,
    notifications,
  ] = await Promise.all([
    getMyOrgs(profile.id),
    profile.role === "parent" ? getActiveChildren(profile.id) : Promise.resolve([]),
    profile.role === "student" ? getParentLinks(profile.id) : Promise.resolve([]),
    getNotificationPreferences(profile.id),
    supabase
      .from("saved_competitions")
      .select("competition_id, created_at")
      .eq("user_id", profile.id),
    supabase
      .from("competition_entrants")
      .select("competition_id, status, created_at")
      .eq("profile_id", profile.id),
    supabase
      .from("notifications")
      .select("kind, title, body, href, created_at, read_at")
      .eq("recipient_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      role: profile.role,
      display_name: profile.display_name,
      state: profile.state,
      zip: profile.zip,
      interests: profile.interests,
      date_of_birth: profile.date_of_birth,
      created_at: profile.created_at,
    },
    organizations: orgs.map((row) => ({
      name: row.org.name,
      slug: row.org.slug,
      type: row.org.type,
      member_role: row.memberRole,
    })),
    saved_competitions: saved.data ?? [],
    rsvps: entrants.data ?? [],
    notification_preferences: preferences,
    notifications: notifications.data ?? [],
    family:
      profile.role === "parent"
        ? {
            linked_students: children.map((child) => ({
              display_name: child.display_name,
            })),
          }
        : {
            linked_parents: parents.map((link) => ({
              display_name: link.parent_name,
              status: link.status,
            })),
          },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="causey-account-export.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
