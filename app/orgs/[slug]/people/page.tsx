import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrganizationPeopleManager } from "@/components/OrganizationPeopleManager";
import { OrgSubnavBar } from "@/components/OrgSubnav";
import { PortalMission } from "@/components/PortalPrimitives";
import { getSessionUser } from "@/lib/auth/session";
import { getOrgInvitations } from "@/lib/data/district";
import { getOrgBySlugForViewer, getOrgRoster } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Invites and staff",
  description: "Provision students and delegate organization staff safely.",
};

export default async function OrganizationPeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setup?: string; district?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/orgs/${slug}/people`);
  const view = await getOrgBySlugForViewer(slug, user.id);
  if (!view) notFound();
  if (!view.isAdmin) redirect(`/orgs/${slug}`);
  const [invitations, roster] = await Promise.all([
    getOrgInvitations(view.org.id),
    getOrgRoster(view.org.id),
  ]);
  const pendingInvites = invitations.filter(
    (row) =>
      row.status === "pending" && new Date(row.expires_at) > new Date()
  );
  const activeStudents = roster.filter(
    (row) => row.member_status === "active" && row.member_role === "student"
  ).length;
  const activeDelegatedSchoolAdmins = roster.filter(
    (row) =>
      row.profile_id !== user.id &&
      row.member_status === "active" &&
      (row.member_role === "school_admin" || row.member_role === "admin")
  ).length;
  const isDistrict = view.org.type === "district";
  const districtSlug =
    query.district && /^[a-z0-9-]+$/.test(query.district)
      ? query.district
      : null;
  const isSchoolAdminSetup =
    query.setup === "school-admin" &&
    view.org.type === "school" &&
    Boolean(view.org.parent_org_id);
  const pendingSchoolAdminInvites = pendingInvites.filter(
    (row) => row.role === "school_admin"
  );
  const needsSchoolAdminHandoff =
    view.org.type === "school" &&
    Boolean(view.org.parent_org_id) &&
    activeDelegatedSchoolAdmins === 0 &&
    pendingSchoolAdminInvites.length === 0;
  const rosterHref = `/orgs/${view.org.slug}/roster#add-students`;
  const hasJoinCode = !isDistrict && Boolean(view.org.join_code);

  let mission: {
    title: string;
    description: string;
    action: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
  if (
    isSchoolAdminSetup &&
    activeDelegatedSchoolAdmins > 0 &&
    view.org.owner_profile_id === user.id
  ) {
    mission = {
      title: "Transfer school ownership",
      description:
        "The school administrator has joined. Hand off ownership so they control day-to-day settings; your district authority remains.",
      action: {
        href: `/orgs/${view.org.slug}/settings?setup=ownership${
          districtSlug
            ? `&district=${encodeURIComponent(districtSlug)}`
            : ""
        }#ownership`,
        label: "Transfer ownership",
      },
      secondary: districtSlug
        ? {
            href: `/orgs/${districtSlug}`,
            label: "Back to district setup",
          }
        : undefined,
    };
  } else if (
    isSchoolAdminSetup &&
    activeDelegatedSchoolAdmins === 0 &&
    pendingSchoolAdminInvites.length > 0
  ) {
    mission = {
      title: "Administrator claim is pending",
      description:
        "Causey queued the claim email. Copy or reissue the link below if the school administrator needs a delivery fallback.",
      action: {
        href: "#invitation-status",
        label: "Review claim link",
      },
      secondary: districtSlug
        ? {
            href: `/orgs/${districtSlug}`,
            label: "Back to district setup",
          }
        : undefined,
    };
  } else if (needsSchoolAdminHandoff) {
    mission = {
      title: "Delegate this school",
      description:
        "Invite a school administrator before provisioning students. Causey emails the claim link and keeps a copyable fallback here.",
      action: { href: "#invite-one", label: "Invite school administrator" },
      secondary: districtSlug
        ? {
            href: `/orgs/${districtSlug}`,
            label: "Back to district setup",
          }
        : {
            href: "/orgs",
            label: "Back to organizations",
          },
    };
  } else if (pendingInvites.length) {
    mission = {
      title: `${pendingInvites.length} ${
        pendingInvites.length === 1 ? "invite is" : "invites are"
      } waiting`,
      description:
        "Recipients claim their own accounts from the private link Causey emails. Use the fallback link if delivery is delayed.",
      action: { href: "#invitation-status", label: "Review invitations" },
      secondary: hasJoinCode
        ? { href: rosterHref, label: "Share student join link" }
        : { href: "#invite-one", label: "Invite someone else" },
    };
  } else if (isDistrict) {
    mission = {
      title: "Delegate district staff",
      description:
        "Invite district administrators or coaches here. Create or open a school workspace for school administrators and students.",
      action: { href: "#invite-one", label: "Invite district staff" },
      secondary: {
        href: `/orgs/${view.org.slug}/settings#schools`,
        label: "Manage schools",
      },
    };
  } else if (!activeStudents && hasJoinCode) {
    mission = {
      title: "Students join with a code",
      description:
        "Share the roster join link for students. Create a private claim link here when you need staff or a one-off invitation.",
      action: { href: rosterHref, label: "Open roster join link" },
      secondary: { href: "#invite-one", label: "Create claim link" },
    };
  } else if (!activeStudents) {
    mission = {
      title: "Invite your first people",
      description:
        "Invites create an expiring claim link — Causey never shares a password. Send staff links directly; students can join from a roster code.",
      action: { href: "#invite-one", label: "Create an invitation" },
      secondary: { href: `/orgs/${view.org.slug}/roster`, label: "Open roster" },
    };
  } else {
    mission = {
      title: "Add staff or more students",
      description: `${activeStudents} ${
        activeStudents === 1 ? "student is" : "students are"
      } on the roster. Create staff claim links here; keep using the join link for most students.`,
      action: { href: "#invite-one", label: "Create claim link" },
      secondary: hasJoinCode
        ? { href: rosterHref, label: "Share student join link" }
        : undefined,
    };
  }

  return (
    <>
      <OrgSubnavBar
        slug={view.org.slug}
        orgName={view.org.name}
        tab="people"
        showRoster={view.isCoach && !isDistrict}
        showAdmin={view.isAdmin}
        orgType={view.org.type}
      />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          People
        </p>
        <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
          Invites &amp; staff
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted">
          {isDistrict
            ? "District staff claim their own accounts here. School administrators and students belong in a school workspace."
            : "Students usually join from a roster link. Use this page to create staff claim links — no shared passwords."}
        </p>

        {isSchoolAdminSetup && districtSlug ? (
          <p className="mt-3 text-sm text-muted">
            Setting up this school from{" "}
            <Link
              href={`/orgs/${districtSlug}`}
              className="font-semibold text-brand-red hover:underline"
            >
              the district workspace
            </Link>
            .
          </p>
        ) : null}

        <div className="mt-8">
          <PortalMission
            title={mission.title}
            description={mission.description}
            action={mission.action}
            secondary={mission.secondary}
          />
        </div>

        {hasJoinCode ? (
          <p className="mt-6 text-sm text-muted">
            Prefer the join link for whole classes?{" "}
            <Link
              href={rosterHref}
              className="font-semibold text-brand-red hover:underline"
            >
              Open roster
            </Link>
          </p>
        ) : null}

        <section className="section-rule mt-10 pt-8">
          <OrganizationPeopleManager
            orgId={view.org.id}
            orgSlug={view.org.slug}
            orgType={view.org.type}
            invitations={invitations}
            rosterHref={isDistrict ? undefined : rosterHref}
            defaultRole={
              needsSchoolAdminHandoff ? "school_admin" : undefined
            }
          />
        </section>
      </main>
    </>
  );
}
