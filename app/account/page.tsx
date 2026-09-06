import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSecurityForm } from "@/components/AccountSecurityForm";
import { PageBackLink } from "@/components/PageBackLink";
import { AccountDataControls } from "@/components/AccountDataControls";
import { AccountSettingsShell } from "@/components/AccountSettingsShell";
import { HouseholdRequestActions } from "@/components/HouseholdRequestActions";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { PortalEmptyState } from "@/components/PortalPrimitives";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileNotReady } from "@/components/ProfileNotReady";
import { UnlinkChildButton } from "@/components/UnlinkChildButton";
import { isCurrentUserPlatformAdmin } from "@/lib/auth/platform-admin";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import type { AccountRole } from "@/lib/auth/types";
import { preferredDiscoveryHref } from "@/lib/category-discovery";
import { getNotificationPreferences } from "@/lib/data/district";
import {
  getActiveChildren,
  getMyOrgs,
  getParentLinks,
  getPendingChildRequestCount,
  type MyOrgRow,
} from "@/lib/data/portal";
import { canCreateOrg, isOrgAdmin } from "@/lib/org-permissions";
import {
  SEARCH_TOURNAMENTS_LABEL,
  accountOrganizationsEmptyCta,
  workspaceOpenCta,
} from "@/lib/portal-copy";

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
  if (!profile) return <ProfileNotReady section="Account settings" />;

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
  const hasDistrictAccess = myOrgs.some(
    (row) =>
      row.org.type === "district" || row.memberRole === "district_admin"
  );
  const hasSchoolAccess = myOrgs.some((row) => row.org.type === "school");
  const hasClubAccess = myOrgs.some(
    (row) => row.org.type === "club" || row.org.type === "team"
  );
  const workspace = workspaceOpenCta(profile.role, {
    hasDistrictAccess,
    hasSchoolAccess,
    hasClubAccess:
      hasClubAccess ||
      (profile.role === "coach" && !hasDistrictAccess && !hasSchoolAccess),
  });
  const organizationsEmpty = accountOrganizationsEmptyCta({
    role: profile.role,
    canCreate: canCreateOrg(profile),
    hasDistrictAccess,
  });
  const showFamily = profile.role === "student" || profile.role === "parent";
  const emailConfirmed = Boolean(user.email_confirmed_at);
  const pendingEmail =
    typeof user.new_email === "string" && user.new_email
      ? user.new_email
      : null;
  const searchHref = profile.preferred_competition_category
    ? preferredDiscoveryHref(profile.preferred_competition_category, {
        zip: profile.zip,
      })
    : "/#search";

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
        {roleLabel} account (locked). Zip sets nearby tournament search
        {profile.role === "student"
          ? "; coaches see name and age band on a roster, not your birth date"
          : ""}
        .
      </p>
      <div className="mt-6">
        <ProfileEditor
          profile={profile}
          orgTypes={myOrgs.map((row) => row.org.type)}
        />
      </div>
      <p className="mt-4">
        <Link
          href={searchHref}
          className="text-sm font-semibold text-muted-strong hover:text-brand-red"
        >
          {profile.zip
            ? `Search tournaments near ${profile.zip}`
            : SEARCH_TOURNAMENTS_LABEL}
        </Link>
      </p>
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

  const dataPanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Your data
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Download a copy or permanently delete this account. If something is
        broken, or you need a listing or comment taken down,{" "}
        <Link
          href="/support"
          className="font-semibold text-brand-red hover:underline"
        >
          report a problem
        </Link>
        .
      </p>
      <div className="mt-6">
        <AccountDataControls email={user.email ?? ""} />
      </div>
    </div>
  );

  const alertsPanel = (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">
        Alerts
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        These preferences control in-app and product-email alerts.{" "}
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
              Family
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
            <PortalEmptyState
              title="No parent links yet"
              description="A parent can start the link from Family, or you can ask one from Plan. When a request arrives, accept it here or on Plan."
              action={workspaceOpenCta("student")}
            />
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
                      {link.status === "active"
                        ? "linked as your parent"
                        : link.awaiting_parent
                          ? "you asked them to link — waiting for them to accept"
                          : "wants to link as your parent"}
                    </span>
                  </div>
                  <HouseholdRequestActions
                    counterpartyProfileId={link.parent_profile_id}
                    state={
                      link.status === "active"
                        ? "linked"
                        : link.awaiting_parent
                          ? "awaiting_them"
                          : "awaiting_me"
                    }
                    confirmUnlinkLabel="Yes, unlink parent"
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
        Rename, ownership, and staff invites live on each workspace&rsquo;s Settings.
      </p>
      {!myOrgs.length ? (
        <PortalEmptyState
          title={
            profile.role === "student"
              ? "Not on a club yet"
              : hasDistrictAccess
                ? "No organizations yet"
                : "No clubs yet"
          }
          description={
            profile.role === "student"
              ? "Ask your coach for a join link, then open My clubs to finish joining."
              : hasDistrictAccess
                ? "District and school workspaces you administer appear here."
                : canCreateOrg(profile)
                  ? "Create a club or team workspace, or wait for a staff invitation claim link."
                  : "Clubs appear here after you join or claim a staff invitation."
          }
          action={organizationsEmpty}
        />
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
            Create another club or team
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
      label: hasDistrictAccess || hasSchoolAccess ? "Organizations" : "Clubs",
      content: orgsPanel,
    },
    { id: "data" as const, label: "Your data", content: dataPanel },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBackLink href={workspace.href}>{workspace.label}</PageBackLink>
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
    </div>
  );
}
