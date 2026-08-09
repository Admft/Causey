import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { getAdminOrganizations } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Add tournament",
  description: "Create a tournament draft for an organization.",
};

export default async function AdminNewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: selectedId } = await searchParams;
  const organizations = await getAdminOrganizations();
  const selected = organizations.find((org) => org.id === selectedId) ?? null;
  const draftId = randomUUID();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/admin/tournaments"
        className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
      >
        ← Back to tournaments
      </Link>
      <p className="mt-6 text-sm font-semibold text-brand-red">Platform admin</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Add a tournament draft
      </h1>
      <p className="mt-2 text-sm text-muted">
        Add a cover and the details families need. The tournament stays out of
        public search until it is published.
      </p>

      {!selected ? (
        <form
          method="get"
          className="section-rule mt-8 flex flex-col gap-4 pt-8"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-strong">
              Hosting organization
            </span>
            <select className="field" name="org" required defaultValue="">
              <option value="" disabled>
                Choose a district, school, club, or team
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} · {org.type}
                </option>
              ))}
            </select>
          </label>
          {!organizations.length ? (
            <p className="text-sm text-muted">
              Create an organization before adding an organizer tournament.
            </p>
          ) : (
            <button type="submit" className="cta-enabled w-fit">
              Continue to tournament details
            </button>
          )}
        </form>
      ) : (
        <div className="section-rule mt-8 pt-8">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm text-muted">
              Hosting as{" "}
              <strong className="font-semibold text-foreground">{selected.name}</strong>
            </p>
            <Link
              href="/admin/tournaments/new"
              className="text-sm font-semibold text-brand-red hover:underline"
            >
              Change organization
            </Link>
          </div>
          <TournamentCreateForm
            orgId={selected.id}
            orgSlug={selected.slug}
            orgState={selected.state}
            draftId={draftId}
            admin
            returnTo="/admin/tournaments?status=published"
          />
        </div>
      )}
    </main>
  );
}
