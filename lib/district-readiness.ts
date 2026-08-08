import type { OrganizationVerificationStatus } from "@/lib/auth/orgs";

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

export function getDistrictSchoolReadinessStatus(
  school: DistrictSchoolReadiness,
  districtSlug: string
): DistrictSchoolReadinessStatus {
  const returnQuery = `district=${encodeURIComponent(districtSlug)}`;
  if (school.verificationStatus !== "verified") {
    return {
      label:
        school.verificationStatus === "rejected"
          ? "Verification needs correction"
          : "Needs platform verification",
      href: `/orgs/${school.slug}/settings`,
      actionLabel: "Review status",
      ready: false,
    };
  }
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

  if (readiness.verificationStatus !== "verified") {
    return {
      stage: "district_verification",
      title:
        readiness.verificationStatus === "rejected"
          ? "Correct the district record"
          : "District verification is pending",
      description:
        readiness.verificationStatus === "rejected"
          ? "Review the platform correction note before adding more schools."
          : "You can prepare school setup while Causey verifies the district identity.",
      href: settingsHref,
      label: "Review district status",
      schoolId: null,
    };
  }

  if (readiness.schools.length === 0) {
    return {
      stage: "create_school",
      title: "Add the first school",
      description:
        "Create a school workspace, then delegate its administrator before provisioning students.",
      href: `${settingsHref}#schools`,
      label: "Create school",
      schoolId: null,
    };
  }

  for (const school of readiness.schools) {
    if (school.verificationStatus !== "verified") {
      return {
        stage: "school_verification",
        title: `${school.name} needs platform verification`,
        description:
          "School setup can continue, but Causey must verify the organization before the pilot is ready.",
        href: `/orgs/${school.slug}/settings`,
        label: "Review school status",
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
          "Invite a school administrator and give them the claim link. Email delivery is not operating yet.",
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
