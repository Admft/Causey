import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSecurityForm } from "@/components/AccountSecurityForm";
import { AccountSettingsShell } from "@/components/AccountSettingsShell";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { ProfileEditor } from "@/components/ProfileEditor";
import { UnlinkChildButton } from "@/components/UnlinkChildButton";
import { homePathForRole } from "@/lib/auth/home-path";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import type { AccountRole } from "@/lib/auth/types";
import { getNotificationPreferences } from "@/lib/data/district";
import {
  getActiveChildren,
  getMyOrgs,
  getParentLinks,
  getPendingChildRequestCount,
  type MyOrgRow,
} from "@/lib/data/portal";
import { canCreateOrg, isOrgAdmin } from "@/lib/org-permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account settings",
  description:
    "Manage your Causey profile, sign-in, alert preferences, family links, and organizations.",
};

const ROLE_LABEL: Record<AccountRole, string> = {
  student: "Student",
  parent: "Parent",
  coach: "Coach / Organizer",
};

function memberRoleLabel(row: MyOrgRow, userId: string): string {
  if (row.org.owner_profile_id === userId) return "Owner";
  switch (row.memberRole) {
    case "student":
      return "Student";
    case "assistant_coach":
      return "Assistant coach";
    case "coach":
      return "Coach";
    case "admin":
      return "Admin";
    case "school_admin":
      return "School admin";
    case "district_admin":
      return "District admin";
    default:
      return "Member";
  }
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="font-display text-display-lg font-bold tracking-tight text-foreground">
          Profile not ready
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your login works, but the profiles table is missing or the signup
          trigger didn&rsquo;t run. Apply{" "}
          <code className="text-foreground">supabase/migrations/0009_accounts.sql</code>{" "}
          in the Supabase SQL editor, then sign out and back in.
        </p>
      </div>
    );
  }

  const [
    preferences,
    myOrgs,
    parentLinks,
    children,
    pendingChildRequests,
    isPlatformAdmin,
  ] = await Promise.all([
    getNotificationPreferences(profile.id),
    getMyOrgs(profile.id),
    profile.role === "student"
      ? getParentLinks(profile.id)
      : Promise.resolve([]),
    profile.role === "parent"
      ? getActiveChildren(profile.id)
      : Promise.resolve([]),
    profile.role === "parent"
      ? getPendingChildRequestCount(profile.id)
      : Promise.resolve(0),
    isCurrentUserPlatformAdmin(),
  ]);

  const roleLabel = ROLE_LABEL[profile.role];
  const workspaceHref = homePathForRole(profile.role);
  const workspaceLabel =
    profile.role === "parent"
      ? "Open family desk"
      : profile.role === "coach"
        ? "Open organizations"
        : "Open my tournaments";
  const showFamily = profile.role === "student" || profile.role === "parent";
  const emailConfirmed = Boolean(user.email_confirmed_at);
  const pendingEmail =
    typeof user.new_email === "string" && user.new_email
      ? user.new_email
      : null;
  const searchHref = profile.zip
    ? `/chess?zip=${encodeURIComponent(profile.zip)}`
    : "/chess";

  let incompleteCue: string | null = null;
  if (!profile.zip) {
    incompleteCue = "Add a home zip for nearby search";
  } else if (!profile.display_name.trim()) {
    incompleteCue = "Add a display name";
  } else if (profile.role === "student" && !profile.date_of_birth) {
    incompleteCue = "Add a date of birth for your age band";
  }

  const profilePanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Profile
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {roleLabel} account (locked). Zip sets nearby chess search
        {profile.role === "student"
          ? "; coaches see name and age band on a roster, not your birth date"
          : ""}
        .
      </p>
      <div className="mt-6">
        <ProfileEditor profile={profile} />
      </div>
      {profile.zip ? (
        <p className="mt-4">
          <Link
            href={searchHref}
            className="text-sm font-semibold text-muted-strong hover:text-brand-red"
          >
            Search tournaments near {profile.zip}
          </Link>
        </p>
      ) : null}
    </div>
  );

  const signinPanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Sign-in
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Change the email or password used to access Causey. Both require your
        current password.
      </p>
      <div className="mt-6">
        <AccountSecurityForm
          email={user.email ?? ""}
          emailConfirmed={emailConfirmed}
          pendingEmail={pendingEmail}
        />
      </div>
    </div>
  );

  const alertsPanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Alerts
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Saved for later — automated reminders and email are not operating yet.{" "}
        <Link
          href="/me/notifications"
          className="font-semibold text-brand-red hover:underline"
        >
          Open alerts inbox
        </Link>
      </p>
      <div className="mt-6">
        <NotificationPreferencesForm initial={preferences} />
      </div>
    </div>
  );

  const familyPanel = showFamily ? (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Family
      </h2>
      {profile.role === "parent" ? (
        <>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Linked students share clubs and RSVP help after they accept.{" "}
            <Link
              href="/family"
              className="font-semibold text-brand-red hover:underline"
            >
              Family desk
            </Link>
          </p>
          {!children.length && pendingChildRequests === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No linked students yet.{" "}
              <Link
                href="/family"
                className="font-semibold text-brand-red hover:underline"
              >
                Send a link request
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {children.map((child) => (
                <li
                  key={child.profile_id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {child.display_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Linked student
                    </span>
                  </div>
                  <UnlinkChildButton
                    childProfileId={child.profile_id}
                    childName={child.display_name}
                  />
                </li>
              ))}
              {pendingChildRequests > 0 ? (
                <li className="py-3 text-sm text-muted">
                  {pendingChildRequests === 1
                    ? "1 request waiting for the student to accept."
                    : `${pendingChildRequests} requests waiting for students to accept.`}
                </li>
              ) : null}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Nothing is shared until you accept. After that, parents can help
            with clubs and RSVPs.
          </p>
          {!parentLinks.length ? (
            <p className="mt-4 text-sm text-muted">No parent links yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {parentLinks.map((link) => (
                <li
                  key={link.parent_profile_id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {link.parent_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {link.status === "pending"
                        ? "wants to link as your parent"
                        : "linked as your parent"}
                    </span>
                  </div>
                  <HouseholdRequestActions
                    parentProfileId={link.parent_profile_id}
                    linked={link.status === "active"}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  ) : null;

  const orgsPanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Organizations
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Rename, ownership, and staff invites live on each org&rsquo;s Settings.
      </p>
      {!myOrgs.length ? (
        <p className="mt-4 text-sm text-muted">
          {profile.role === "student" ? (
            <>
              Not on a club yet.{" "}
              <Link
                href="/orgs"
                className="font-semibold text-brand-red hover:underline"
              >
                Open my clubs
              </Link>
            </>
          ) : canCreateOrg(profile) ? (
            <>
              No organizations yet.{" "}
              <Link
                href="/orgs/new"
                className="font-semibold text-brand-red hover:underline"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              No organizations yet.{" "}
              <Link
                href="/orgs"
                className="font-semibold text-brand-red hover:underline"
              >
                Open organizations
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {myOrgs.map((row) => {
            const admin = isOrgAdmin(
              row.org,
              row.memberRole
                ? { role: row.memberRole, status: "active" }
                : null,
              profile.id
            );
            return (
              <li key={row.org.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Link
                      href={`/orgs/${row.org.slug}`}
                      className="text-sm font-semibold text-foreground hover:text-brand-red"
                    >
                      {row.org.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.org.type}
                      {" · "}
                      {memberRoleLabel(row, profile.id)}
                      {row.org.state ? ` · ${row.org.state}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <Link
                      href={`/orgs/${row.org.slug}`}
                      className="text-muted-strong hover:text-brand-red"
                    >
                      Overview
                    </Link>
                    {row.isCoach ? (
                      <Link
                        href={`/orgs/${row.org.slug}/roster`}
                        className="text-muted-strong hover:text-brand-red"
                      >
                        Roster
                      </Link>
                    ) : null}
                    {admin ? (
                      <>
                        <Link
                          href={`/orgs/${row.org.slug}/people`}
                          className="text-muted-strong hover:text-brand-red"
                        >
                          People
                        </Link>
                        <Link
                          href={`/orgs/${row.org.slug}/settings`}
                          className="text-brand-red hover:underline"
                        >
                          Settings
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {canCreateOrg(profile) && myOrgs.length > 0 ? (
        <p className="mt-4">
          <Link
            href="/orgs/new"
            className="text-sm font-semibold text-brand-red hover:underline"
          >
            Create another organization
          </Link>
        </p>
      ) : null}
    </div>
  );

  const panels = [
    { id: "profile" as const, label: "Profile", content: profilePanel },
    { id: "signin" as const, label: "Sign-in", content: signinPanel },
    { id: "alerts" as const, label: "Alerts", content: alertsPanel },
    ...(familyPanel
      ? [{ id: "family" as const, label: "Family", content: familyPanel }]
      : []),
    {
      id: "organizations" as const,
      label: "Organizations",
      content: orgsPanel,
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href={workspaceHref}
          className="text-sm font-semibold text-muted-strong hover:text-brand-red"
        >
          ← {workspaceLabel}
        </Link>
        <Link
          href="/me"
          className="text-sm font-semibold text-muted-strong hover:text-brand-red"
        >
          Tournament plan
        </Link>
      </div>

      <h1 className="mt-6 font-display text-display-lg font-bold tracking-tight text-foreground">
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted">
        {profile.display_name || "Your profile"} · {user.email} · {roleLabel}
        {isPlatformAdmin ? (
          <>
            {" · "}
            <Link
              href="/admin"
              className="font-semibold text-brand-red hover:underline"
            >
              Admin
            </Link>
          </>
        ) : null}
      </p>
      {incompleteCue ? (
        <p className="mt-3 text-sm text-muted">
          {incompleteCue}.{" "}
          <a
            href="#profile"
            className="font-semibold text-brand-red hover:underline"
          >
            Edit profile
          </a>
        </p>
      ) : null}

      <AccountSettingsShell panels={panels} />
    </main>
  );
}
