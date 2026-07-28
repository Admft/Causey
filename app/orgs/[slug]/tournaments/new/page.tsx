import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getSessionUser } from "@/lib/auth/session";
import { getOrgBySlugForViewer, isSupabaseConfigured } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create tournament",
  description: "Host a tournament for your organization — private or public.",
};

export default async function NewTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/tournaments/new`);

  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isCoach) redirect(`/orgs/${slug}`);
  const { org } = view;

  return (
    <>
      <OrgSubnavBar slug={org.slug} orgName={org.name} tab="overview" showRoster />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-brand-red">New tournament</p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Host a tournament
        </h1>
        <p className="mt-2 text-sm text-muted">
          It gets an event page like every other tournament on Causey. Keep it
          private for your roster, or list it publicly for anyone to find.
        </p>
        <div className="section-rule mt-8 pt-8">
          <TournamentCreateForm
            orgId={org.id}
            orgSlug={org.slug}
            orgState={org.state}
          />
        </div>
      </div>
    </>
  );
}
