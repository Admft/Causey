import type { Metadata } from "next";
import Link from "next/link";
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

type OrgPreview = {
  id: string;
  name: string;
  type: string;
  state: string | null;
};

type OrgPreviewResult =
  | { ok: true; org: OrgPreview | null }
  | { ok: false };

function NoMatch({ code }: { code?: string }) {
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Join
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        That code didn&rsquo;t match
      </h1>
      <p className="mt-3 text-sm text-muted">
        Codes are eight characters, like 2P85-8DZ6, and come from your coach. Double-check the
        link, or ask your coach to share it again — they may have rotated the
        code.
        {code ? (
          <>
            {" "}
            You opened <span className="font-semibold text-foreground">{formatJoinCode(code)}</span>.
          </>
        ) : null}
      </p>
      <p className="mt-6 text-sm text-muted">
        Still have the right code? Ask your coach for a fresh link, or{" "}
        <Link href="/#search" className="font-semibold text-brand-red hover:underline">
          search tournaments
        </Link>{" "}
        while you wait.
      </p>
    </div>
  );
}

function PreviewUnavailable({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Join
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        We couldn&rsquo;t check that team code
      </h1>
      <p className="mt-3 text-sm text-muted">
        The code format is valid, but Causey could not reach the team lookup
        right now. Your coach does not need to create a new code.
      </p>
      <p className="mt-4 text-sm text-muted">
        Try <span className="font-semibold text-foreground">{formatJoinCode(code)}</span>{" "}
        again in a few minutes.
      </p>
    </div>
  );
}

async function loadOrgPreview(code: string): Promise<OrgPreviewResult> {
  const supabase = await createServerSupabaseClient();
  const { data: previews, error } = await supabase.rpc(
    "get_org_preview_by_code",
    { p_code: code }
  );
  if (error) {
    console.error("Could not load organization join preview:", error.code);
    return { ok: false };
  }
  return {
    ok: true,
    org: (previews?.[0] as OrgPreview | undefined) ?? null,
  };
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

  if (!isValidJoinCode(code)) return <NoMatch code={code || undefined} />;

  const user = await getSessionUser();
  const preview = await loadOrgPreview(code);
  if (!preview.ok) return <PreviewUnavailable code={code} />;
  const org = preview.org;
  // Fail closed for everyone. Never ask a visitor to create an account unless
  // the anonymous preview resolved a real, current organization.
  if (!org) return <NoMatch code={code} />;

  const joinPath = `/join/${code}`;
  const signupHref = `/signup?next=${encodeURIComponent(joinPath)}`;
  const loginHref = `/login?next=${encodeURIComponent(joinPath)}`;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          Student invite · {formatJoinCode(code)}
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Join {org.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ORG_TYPE_LABEL[org.type] ?? org.type}
          {org.state ? ` · ${org.state}` : ""}
        </p>
        <p className="mt-4 text-sm text-muted">
          Create a student account to get on the roster. Your coach will see
          your display name and age band, and can invite you to tournaments.
        </p>

        <div className="mt-8 rounded-2xl border border-accent/25 bg-accent-soft/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
            What to do next
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            New here? Create a student account
          </h2>
          <p className="mt-2 text-sm text-muted">
            After you confirm your email, we&rsquo;ll bring you back here to
            finish joining.
          </p>
          <Link href={signupHref} className="cta-enabled mt-5 inline-flex">
            Create student account
          </Link>
          <p className="mt-4 text-sm text-muted">
            Already have a student account?{" "}
            <Link
              href={loginHref}
              className="font-semibold text-brand-red hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
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
