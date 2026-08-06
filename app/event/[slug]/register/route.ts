import { getSessionUser } from "@/lib/auth/session";
import { getDataSource } from "@/lib/data";
import { getCompetitionBySlugAuthed } from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Records the organizer-site handoff for signed-in users, then gets out of the
 * way. Registration and payment still happen entirely on the external site.
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
    const supabase = await createServerSupabaseClient();
    const { data: existing } = await supabase
      .from("external_registrations")
      .select("status")
      .eq("user_id", user.id)
      .eq("competition_id", competition.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("external_registrations").insert({
        user_id: user.id,
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
        .eq("user_id", user.id)
        .eq("competition_id", competition.id);
    }
  }

  return Response.redirect(competition.reg_url, 302);
}
