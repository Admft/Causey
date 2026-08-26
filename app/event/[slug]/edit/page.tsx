import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelTournamentButton } from "@/components/CancelTournamentButton";
import { EventOrganizerSubnav } from "@/components/EventOrganizerSubnav";
import { PageBackLink } from "@/components/PageBackLink";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompetitionAsViewer,
  getCompetitionBySlugAuthed,
  getOrgBySlugForViewer,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { manageEventTitle } from "@/lib/portal-copy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit listing",
  description: "Change details or cancel a competition you host.",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) redirect(`/event/${slug}`);
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/event/${slug}/edit`);

  const competition = await getCompetitionBySlugAuthed(slug);
  if (!competition) notFound();
  const canManage = await canManageCompetitionAsViewer(competition, user.id);
  if (!canManage || !competition.org_id) redirect(`/event/${slug}`);

  const supabase = await createServerSupabaseClient();
  const [{ data: org }, { data: moderation }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, slug, state, name, type, parent_org_id")
      .eq("id", competition.org_id)
      .maybeSingle(),
    supabase
      .from("competitions")
      .select("status, moderation_note")
      .eq("id", competition.id)
      .maybeSingle(),
  ]);
  if (!org) redirect(`/event/${slug}`);

  const view = await getOrgBySlugForViewer(org.slug, user.id);

  return (
    <>
      {view ? (
        <OrgSubnavBar
          slug={view.org.slug}
          orgName={view.org.name}
          tab={null}
          showRoster={view.isCoach && view.org.type !== "district"}
          showAdmin={view.isAdmin}
          orgType={view.org.type}
        />
      ) : (
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-2.5 sm:px-8">
            <p className="truncate text-xs font-semibold text-muted">
              <Link href="/orgs" className="hover:text-foreground">
                Organizations
              </Link>{" "}
              / <span className="text-muted-strong">{org.name}</span>
            </p>
          </div>
        </div>
      )}
      <EventOrganizerSubnav
        slug={competition.slug}
        tab="listing"
        canEditListing
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <PageBackLink href={`/orgs/${org.slug}`}>{org.name}</PageBackLink>
          <Link
            href={`/event/${competition.slug}`}
            className="text-sm font-semibold text-muted-strong hover:text-brand-red"
          >
            Event page
          </Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-brand-red">
          {manageEventTitle(org.type)}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Edit listing
        </h1>
        <p className="mt-2 text-sm text-muted">
          {competition.name}. The event link stays the same — everyone
          you&rsquo;ve invited keeps seeing the updated details.
        </p>
        {moderation?.status === "rejected" ? (
          <section className="mt-6 rounded-2xl border border-brand-red/30 bg-accent-soft p-5">
            <h2 className="text-base font-semibold text-foreground">
              Changes requested before this can be public
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted-strong">
              {moderation.moderation_note ||
                "Review the competition details, correct the listing, and resubmit it."}
            </p>
            <p className="mt-2 text-xs text-muted">
              Saving this returned listing will send it back to platform review.
            </p>
          </section>
        ) : null}
        <div className="section-rule mt-8 pt-8">
          <TournamentCreateForm
            orgId={org.id}
            orgSlug={org.slug}
            orgState={org.state}
            orgType={org.type}
            parentOrgId={org.parent_org_id}
            initial={{
              category: competition.category,
              custom_category_name: competition.custom_category_name,
              participation_mode: competition.participation_mode,
              name: competition.name,
              start_date: competition.start_date,
              end_date: competition.end_date,
              reg_deadline: competition.reg_deadline,
              venue_name: competition.venue_name,
              address: competition.address,
              city: competition.city,
              state: competition.state,
              zip: competition.zip,
              entry_fee_cents: competition.entry_fee_cents,
              reg_url: competition.reg_url,
              visibility: competition.visibility,
              audience: competition.audience,
              rated: competition.rated,
              facets: competition.details.facets,
              image_url: competition.image_url,
              sections: competition.sections.map((section) => ({
                name: section.name,
                minRating: section.min_rating,
                maxRating: section.max_rating,
                minGrade: section.min_grade,
                maxGrade: section.max_grade,
                entryFeeCents: section.entry_fee_cents,
              })),
            }}
            edit={{
              competitionId: competition.id,
              eventSlug: competition.slug,
              status: competition.status,
            }}
          />
        </div>
        <div className="section-rule mt-10 pt-8">
          <CancelTournamentButton
            competitionId={competition.id}
            eventSlug={competition.slug}
            orgSlug={org.slug}
          />
        </div>
      </div>
    </>
  );
}
