import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgCreateForm } from "@/components/OrgCreateForm";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/data/portal";
import { canCreateOrg } from "@/lib/org-permissions";

export const metadata: Metadata = {
  title: "Create a club or team",
  description:
    "Create a club or team roster with a shareable student join code. Schools and districts are provisioned separately.",
};

export default async function NewOrgPage() {
  if (!isSupabaseConfigured()) redirect("/orgs");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orgs/new");
  const profile = await getCurrentProfile();
  if (!canCreateOrg(profile)) redirect("/orgs");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Clubs and teams</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Create a club or team
      </h1>
      <p className="mt-2 text-sm text-muted">
        This is a coach account creating a club workspace. You&rsquo;ll get a
        student join code. Invite other coaches as staff after the club exists.
        School and district workspaces are provisioned separately by Causey.
      </p>
      <div className="section-rule mt-8 pt-8">
        <OrgCreateForm />
      </div>
    </div>
  );
}
