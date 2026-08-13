import type { OrganizationVerificationStatus } from "@/lib/auth/orgs";

export type DistrictReadResult<T> =
  | { ok: true; data: T }
  | { ok: false };

export type DistrictSchoolReadiness = {
  id: string;
  name: string;
  slug: string;
  verificationStatus: OrganizationVerificationStatus;
  activeStudents: number;
  activeDelegatedAdmins: number;
  pendingAdminInvites: number;
  ownershipTransferred: boolean;
};

export type DistrictPilotReadiness = {
  districtId: string;
  districtSlug: string;
  verificationStatus: OrganizationVerificationStatus;
  schools: DistrictSchoolReadiness[];
};

export type DistrictReadinessAction = {
  stage:
    | "district_verification"
    | "create_school"
    | "school_verification"
    | "invite_admin"
    | "await_admin_claim"
    | "transfer_ownership"
    | "provision_students"
    | "await_platform_verification"
    | "review_reporting";
  title: string;
  description: string;
  href: string;
  label: string;
  schoolId: string | null;
};

export type DistrictSchoolReadinessStatus = {
  label: string;
  href: string;
  actionLabel: string;
  ready: boolean;
};

export type DistrictReadinessSummary = {
  totalSchools: number;
  readySchools: number;
  nextAction: DistrictReadinessAction;
};

function schoolSetupStatus(
  school: DistrictSchoolReadiness,
  districtSlug: string
): DistrictSchoolReadinessStatus | null {
  const returnQuery = `district=${encodeURIComponent(districtSlug)}`;
  if (school.activeDelegatedAdmins === 0 && school.pendingAdminInvites > 0) {
    return {
      label: "Awaiting administrator claim",
      href: `/orgs/${school.slug}/people?setup=school-admin&${returnQuery}`,
      actionLabel: "Review invitation",
      ready: false,
    };
  }
  if (school.activeDelegatedAdmins === 0) {
    return {
      label: "Needs school administrator",
      href: `/orgs/${school.slug}/people?setup=school-admin&${returnQuery}`,
      actionLabel: "Invite administrator",
      ready: false,
    };
  }
  if (!school.ownershipTransferred) {
    return {
      label: "Needs ownership handoff",
      href: `/orgs/${school.slug}/settings?setup=ownership&${returnQuery}#ownership`,
      actionLabel: "Transfer ownership",
      ready: false,
    };
  }
  if (school.activeStudents === 0) {
    return {
      label: "Needs students",
      href: `/orgs/${school.slug}/roster?${returnQuery}#add-students`,
      actionLabel: "Provision students",
      ready: false,
    };
  }
  return null;
}

export function getDistrictSchoolReadinessStatus(
  school: DistrictSchoolReadiness,
  districtSlug: string
): DistrictSchoolReadinessStatus {
  // Rejected verification is the only verification state staff can act on.
  if (school.verificationStatus === "rejected") {
    return {
      label: "Verification needs correction",
      href: `/orgs/${school.slug}/settings#verification`,
      actionLabel: "Correct school details",
      ready: false,
    };
  }

  const setup = schoolSetupStatus(school, districtSlug);
  if (setup) {
    if (school.verificationStatus === "pending") {
      return {
        ...setup,
        label: `${setup.label} · platform review pending`,
      };
    }
    return setup;
  }

  if (school.verificationStatus === "pending") {
    return {
      label: "Setup ready · platform review pending",
      href: `/orgs/${school.slug}`,
      actionLabel: "Open school",
      ready: false,
    };
  }

  return {
    label: "Ready for pilot",
    href: `/orgs/${school.slug}`,
    actionLabel: "Open school",
    ready: true,
  };
}

export function getDistrictReadinessAction(
  readiness: DistrictPilotReadiness
): DistrictReadinessAction {
  const settingsHref = `/orgs/${readiness.districtSlug}/settings`;

  // Only rejected verification blocks setup. Pending review is Causey-side work.
  if (readiness.verificationStatus === "rejected") {
    return {
      stage: "district_verification",
      title: "Correct the district record",
      description:
        "Review the platform correction note before adding more schools.",
      href: `${settingsHref}#verification`,
      label: "Correct district details",
      schoolId: null,
    };
  }

  if (readiness.schools.length === 0) {
    return {
      stage: "create_school",
      title: "Add the first school",
      description:
        readiness.verificationStatus === "pending"
          ? "Create a school workspace while Causey reviews the district identity. Then delegate its administrator before provisioning students."
          : "Create a school workspace, then delegate its administrator before provisioning students.",
      href: `${settingsHref}#schools`,
      label: "Create school",
      schoolId: null,
    };
  }

  for (const school of readiness.schools) {
    if (school.verificationStatus === "rejected") {
      return {
        stage: "school_verification",
        title: `Correct ${school.name}`,
        description:
          "Platform review returned this school. Fix the record, then continue staffing.",
        href: `/orgs/${school.slug}/settings#verification`,
        label: "Correct school details",
        schoolId: school.id,
      };
    }
  }

  for (const school of readiness.schools) {
    if (
      school.activeDelegatedAdmins === 0 &&
      school.pendingAdminInvites === 0
    ) {
      return {
        stage: "invite_admin",
        title: `Delegate ${school.name}`,
        description:
          school.verificationStatus === "pending"
            ? "Invite a school administrator while Causey reviews the school identity. Causey emails the claim link and keeps a copyable fallback for district staff."
            : "Invite a school administrator. Causey emails the claim link and keeps a copyable fallback for district staff.",
        href: `/orgs/${school.slug}/people?setup=school-admin&district=${encodeURIComponent(
          readiness.districtSlug
        )}`,
        label: "Invite school administrator",
        schoolId: school.id,
      };
    }
  }

  for (const school of readiness.schools) {
    if (
      school.activeDelegatedAdmins === 0 &&
      school.pendingAdminInvites > 0
    ) {
      return {
        stage: "await_admin_claim",
        title: `${school.name} is awaiting an administrator`,
        description:
          "Share or reissue the claim link, then return after the administrator accepts.",
        href: `/orgs/${school.slug}/people?setup=school-admin&district=${encodeURIComponent(
          readiness.districtSlug
        )}`,
        label: "Review claim link",
        schoolId: school.id,
      };
    }
  }

  for (const school of readiness.schools) {
    if (!school.ownershipTransferred) {
      return {
        stage: "transfer_ownership",
        title: `Hand off ${school.name}`,
        description:
          "The administrator has joined. Transfer school ownership for day-to-day control; district authority remains through the parent district.",
        href: `/orgs/${school.slug}/settings?setup=ownership&district=${encodeURIComponent(
          readiness.districtSlug
        )}#ownership`,
        label: "Transfer ownership",
        schoolId: school.id,
      };
    }
  }

  for (const school of readiness.schools) {
    if (school.activeStudents === 0) {
      return {
        stage: "provision_students",
        title: `Provision students at ${school.name}`,
        description:
          "Open the roster and share its student join link before inviting students to tournaments.",
        href: `/orgs/${school.slug}/roster?district=${encodeURIComponent(
          readiness.districtSlug
        )}#add-students`,
        label: "Open school roster",
        schoolId: school.id,
      };
    }
  }

  const pendingSchool = readiness.schools.find(
    (school) => school.verificationStatus === "pending"
  );
  if (readiness.verificationStatus === "pending" || pendingSchool) {
    return {
      stage: "await_platform_verification",
      title: pendingSchool
        ? `${pendingSchool.name} is awaiting Causey verification`
        : "District verification is pending",
      description:
        "Staffing and competitions can continue. Organization identity review happens in the Causey admin queue — there is nothing to submit from this workspace.",
      href: pendingSchool
        ? `/orgs/${pendingSchool.slug}`
        : `/orgs/${readiness.districtSlug}/settings#verification`,
      label: pendingSchool ? "Open school" : "View verification status",
      schoolId: pendingSchool?.id ?? null,
    };
  }

  return {
    stage: "review_reporting",
    title: "District setup is ready for the pilot",
    description:
      "Every school is verified, delegated, and provisioned. Review participation by school before the first tournament.",
    href: `/orgs/${readiness.districtSlug}/reports`,
    label: "Review district reporting",
    schoolId: null,
  };
}

export function getDistrictReadinessSummary(
  readiness: DistrictPilotReadiness
): DistrictReadinessSummary {
  return {
    totalSchools: readiness.schools.length,
    readySchools: readiness.schools.filter(
      (school) =>
        getDistrictSchoolReadinessStatus(school, readiness.districtSlug).ready
    ).length,
    nextAction: getDistrictReadinessAction(readiness),
  };
}
