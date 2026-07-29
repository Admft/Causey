import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CancelTournamentButton } from "@/components/CancelTournamentButton";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getSessionUser } from "@/lib/auth/session";
import {
  canManageCompetitionAsViewer,
  getCompetitionBySlugAuthed,
  isSupabaseConfigured,
} from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit tournament",
  description: "Change details or cancel a tournament you host.",
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
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, state")
    .eq("id", competition.org_id)
    .maybeSingle();
  if (!org) redirect(`/event/${slug}`);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href={`/event/${competition.slug}`}
        className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        ← Back to event page
      </Link>
      <p className="mt-6 text-sm font-semibold text-brand-red">Hosting</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Edit {competition.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        The event link stays the same — everyone you&rsquo;ve invited keeps
        seeing the updated details.
      </p>
      <div className="section-rule mt-8 pt-8">
        <TournamentCreateForm
          orgId={org.id}
          orgSlug={org.slug}
          orgState={org.state}
          initial={{
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
            rated: competition.rated,
          }}
          edit={{ competitionId: competition.id, eventSlug: competition.slug }}
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
  );
}
