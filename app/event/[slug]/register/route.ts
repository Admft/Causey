import { getSessionUser } from "@/lib/auth/session";
import { getDataSource } from "@/lib/data";
import { getCompetitionBySlugAuthed } from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Records the organizer-site handoff for signed-in users, then gets out of the
 * way. Registration and payment still happen entirely on the external site.
 *
 * Parents pass ?for=<childProfileId> so the opened stamp lands on the student.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const competition =
    (await getDataSource().getCompetitionBySlug(slug)) ??
    (await getCompetitionBySlugAuthed(slug));

  if (!competition?.reg_url) {
    return Response.redirect(new URL(`/event/${slug}`, request.url), 302);
  }

  const user = await getSessionUser();
  if (user) {
    const forParam = new URL(request.url).searchParams.get("for");
    const requestedFor =
      forParam && UUID_RE.test(forParam) ? forParam : user.id;
    const supabase = await createServerSupabaseClient();

    let targetUserId = user.id;
    if (requestedFor !== user.id) {
      const { data: link } = await supabase
        .from("household_links")
        .select("child_profile_id")
        .eq("parent_profile_id", user.id)
        .eq("child_profile_id", requestedFor)
        .eq("status", "active")
        .maybeSingle();
      if (link) targetUserId = requestedFor;
    }

    const { data: existing } = await supabase
      .from("external_registrations")
      .select("status")
      .eq("user_id", targetUserId)
      .eq("competition_id", competition.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("external_registrations").insert({
        user_id: targetUserId,
        competition_id: competition.id,
        status: "opened",
      });
    } else if (existing.status !== "registered") {
      const openedAt = new Date().toISOString();
      await supabase
        .from("external_registrations")
        .update({
          status: "opened",
          opened_at: openedAt,
          status_updated_at: openedAt,
        })
        .eq("user_id", targetUserId)
        .eq("competition_id", competition.id);
    }
  }

  return Response.redirect(competition.reg_url, 302);
}
