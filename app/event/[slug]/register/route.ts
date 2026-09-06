import { getSessionUser } from "@/lib/auth/session";
import { getDataSource } from "@/lib/data";
import { getCompetitionBySlugAuthed } from "@/lib/data/portal";
import { performMarkRegistrationOpened } from "@/lib/external-registration-write";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeOrganizerRegistrationUrl } from "@/lib/actions/registration-redirect";

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

  if (!competition) {
    return Response.redirect(new URL(`/event/${slug}`, request.url), 302);
  }
  const registrationUrl = competition.reg_url
    ? safeOrganizerRegistrationUrl(competition.reg_url)
    : null;
  if (!registrationUrl) {
    return Response.redirect(new URL(`/event/${slug}`, request.url), 302);
  }

  const user = await getSessionUser();
  if (user) {
    const forParam = new URL(request.url).searchParams.get("for");
    const supabase = await createServerSupabaseClient();

    let targetUserId: string | null = user.id;
    if (forParam && !UUID_RE.test(forParam)) {
      targetUserId = null;
      console.error("Registration handoff ignored an invalid linked-profile id.");
    } else if (forParam && forParam !== user.id) {
      const { data: link, error: linkError } = await supabase
        .from("household_links")
        .select("child_profile_id")
        .eq("parent_profile_id", user.id)
        .eq("child_profile_id", forParam)
        .eq("status", "active")
        .maybeSingle();
      if (linkError) {
        targetUserId = null;
        console.error("Registration handoff link lookup failed:", {
          code: linkError.code,
          message: linkError.message,
        });
      } else if (!link) {
        targetUserId = null;
        console.error("Registration handoff ignored a missing or revoked child link.");
      } else {
        targetUserId = forParam;
      }
    }

    if (targetUserId) {
      const stamped = await performMarkRegistrationOpened({
        supabase,
        userId: user.id,
        competitionId: competition.id,
        profileId: targetUserId,
      });
      if (!stamped.ok) {
        console.error("Registration handoff stamp failed:", stamped.error);
      }
    }
  }

  return Response.redirect(registrationUrl, 302);
}
