import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgCreateForm } from "@/components/OrgCreateForm";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/data/portal";
import { canCreateOrg } from "@/lib/org-permissions";

export const metadata: Metadata = {
  title: "Start an organization",
  description: "Create a school or club roster with a shareable join code.",
};

export default async function NewOrgPage() {
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orgs/new");
  const profile = await getCurrentProfile();
  if (!canCreateOrg(profile)) redirect("/orgs");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Organizations</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Start an organization
      </h1>
      <p className="mt-2 text-sm text-muted">
        You&rsquo;ll get a join code to share — students who enter it land on
        your roster instantly.
      </p>
      <div className="section-rule mt-8 pt-8">
        <OrgCreateForm />
      </div>
    </div>
  );
}
