import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinByCodeButton } from "@/components/JoinByCodeButton";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/data/portal";
import { formatJoinCode, isValidJoinCode, normalizeJoinCode } from "@/lib/org-codes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join an organization",
  description: "Use a coach's join code to join their roster on Causey.",
};

const ORG_TYPE_LABEL: Record<string, string> = {
  school: "School",
  club: "Club",
  team: "Team",
  district: "District",
};

function NoMatch() {
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Join</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        That code didn&rsquo;t match
      </h1>
      <p className="mt-3 text-sm text-muted">
        Codes look like BCDF-GHJK and come from your coach. Double-check it, or
        ask your coach to share the link again — they may have rotated the
        code.
      </p>
      <Link href="/orgs" className="cta-enabled mt-6 inline-flex">
        Enter a code manually
      </Link>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeJoinCode(decodeURIComponent(rawCode));

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Join an organization
        </h1>
        <p className="mt-3 text-sm text-muted">
          Accounts aren&rsquo;t configured on this deployment yet.
        </p>
      </div>
    );
  }

  if (!isValidJoinCode(code)) return <NoMatch />;

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/join/${code}`);

  const supabase = await createServerSupabaseClient();
  const { data: previews } = await supabase.rpc("get_org_preview_by_code", {
    p_code: code,
  });
  const org = previews?.[0] as
    | { id: string; name: string; type: string; state: string | null }
    | undefined;
  if (!org) return <NoMatch />;

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">
        Join code {formatJoinCode(code)}
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {org.name}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {ORG_TYPE_LABEL[org.type] ?? org.type}
        {org.state ? ` · ${org.state}` : ""}
      </p>
      <p className="mt-4 text-sm text-muted">
        Joining puts you on this organization&rsquo;s roster: your coach sees
        your display name and age band, and can invite you to tournaments.
      </p>
      <div className="mt-6">
        <JoinByCodeButton code={code} orgName={org.name} />
      </div>
    </div>
  );
}
