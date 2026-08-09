import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getSessionUser } from "@/lib/auth/session";
import {
  getOrgBySlugForViewer,
  getTournamentDraftForViewer,
  isSupabaseConfigured,
} from "@/lib/data/portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create tournament",
  description: "Host a tournament for your organization — private or public.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { slug } = await params;
  const { draft: requestedDraftId } = await searchParams;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/tournaments/new`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.canManageTournaments) redirect(`/orgs/${slug}`);
  const { org } = view;
  const requestedDraft =
    requestedDraftId && UUID_PATTERN.test(requestedDraftId)
      ? await getTournamentDraftForViewer(requestedDraftId, org.id)
      : null;
  if (requestedDraftId && !requestedDraft) {
    redirect(`/orgs/${org.slug}/tournaments/new`);
  }
  const draftId = requestedDraft?.id ?? randomUUID();

  return (
    <>
      <OrgSubnavBar
        slug={org.slug}
        orgName={org.name}
        tab="overview"
        showRoster={org.type !== "district"}
        showAdmin={view.isAdmin}
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">New tournament</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {requestedDraft ? "Resume tournament draft" : "Host a tournament"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add a cover and the details families need. Causey saves this draft so
          you can leave and return. Member-only events publish immediately;
          public listings go to platform review before appearing in search.
        </p>
        <div className="section-rule mt-8 pt-8">
          <TournamentCreateForm
            orgId={org.id}
            orgSlug={org.slug}
            orgState={org.state}
            draftId={draftId}
            initialDraft={requestedDraft ?? undefined}
          />
        </div>
      </div>
    </>
  );
}
