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
  title: "Create competition",
  description: "Host a scheduled competition for a school, district, club, or team.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewCompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string; host?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/competitions/new`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.canManageTournaments) redirect(`/orgs/${slug}/competitions`);

  const districtHosts =
    view.org.type === "district"
      ? [
          {
            id: view.org.id,
            name: view.org.name,
            state: view.org.state,
            type: view.org.type,
            parentOrgId: view.org.parent_org_id,
          },
          ...view.schools.map((school) => ({
            id: school.id,
            name: school.name,
            state: school.state,
            type: "school" as const,
            parentOrgId: view.org.id,
          })),
        ]
      : [
          {
            id: view.org.id,
            name: view.org.name,
            state: view.org.state,
            type: view.org.type,
            parentOrgId: view.org.parent_org_id,
          },
        ];
  const targetHost =
    districtHosts.find((host) => host.id === query.host) ?? districtHosts[0];
  const hostChosen =
    view.org.type !== "district" ||
    districtHosts.some((host) => host.id === query.host);
  const requestedDraft =
    query.draft && UUID_PATTERN.test(query.draft)
      ? await getTournamentDraftForViewer(query.draft, targetHost.id)
      : null;
  if (query.draft && !requestedDraft) {
    redirect(
      `/orgs/${view.org.slug}/competitions/new?host=${encodeURIComponent(
        targetHost.id
      )}`
    );
  }
  const draftId = requestedDraft?.id ?? randomUUID();

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="competitions"
        showRoster={view.isCoach && view.org.type !== "district"}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">New competition</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          {requestedDraft ? "Resume competition draft" : "Host a competition"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Choose the competition type, add the details families need, and
          select who can see it. Member events publish immediately; public
          listings go to platform review.
        </p>

        {view.org.type === "district" && !requestedDraft ? (
          <form
            method="get"
            className="mt-6 rounded-xl border border-line bg-surface p-4"
          >
            <label className="block">
              <span className="text-xs font-semibold text-muted-strong">
                Hosting organization
              </span>
              <span className="mt-1 block text-xs text-muted">
                Choose District-wide or one connected school. Causey stores one
                event under the selected host.
              </span>
              <select
                name="host"
                className="field mt-2"
                defaultValue={targetHost.id}
              >
                {districtHosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.id === view.org.id
                      ? `${host.name} (district-wide)`
                      : host.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="cta-enabled mt-3">
              Continue with this host
            </button>
          </form>
        ) : null}

        {hostChosen || requestedDraft ? (
          <>
            <p className="mt-6 border-l-2 border-brand-red pl-3 text-sm text-muted-strong">
              Hosting for <span className="font-semibold">{targetHost.name}</span>
            </p>

            <div className="section-rule mt-8 pt-8">
              <TournamentCreateForm
                orgId={targetHost.id}
                orgSlug={view.org.slug}
                orgState={targetHost.state}
                orgType={targetHost.type}
                parentOrgId={targetHost.parentOrgId}
                draftId={draftId}
                initialDraft={requestedDraft ?? undefined}
                defaultAudience={
                  targetHost.type === "district" ? "district" : "school"
                }
                returnTo={`/orgs/${view.org.slug}/competitions`}
              />
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Choose the hosting organization to continue.
          </p>
        )}
      </div>
    </>
  );
}
