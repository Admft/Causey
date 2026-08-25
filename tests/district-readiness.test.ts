import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getDistrictReadinessAction,
  getDistrictReadinessSummary,
  getDistrictSchoolReadinessStatus,
  type DistrictPilotReadiness,
  type DistrictSchoolReadiness,
} from "@/lib/district-readiness";

const baseSchool: DistrictSchoolReadiness = {
  id: "school-1",
  name: "Lincoln Middle School",
  slug: "lincoln-middle-school",
  verificationStatus: "verified",
  activeStudents: 10,
  activeDelegatedAdmins: 1,
  pendingAdminInvites: 0,
  ownershipTransferred: true,
};

function readiness(
  school?: Partial<DistrictSchoolReadiness>
): DistrictPilotReadiness {
  return {
    districtId: "district-1",
    districtSlug: "sample-district",
    verificationStatus: "verified",
    schools: school ? [{ ...baseSchool, ...school }] : [],
  };
}

describe("district pilot readiness priority", () => {
  it("only blocks on rejected district verification, not pending review", () => {
    expect(
      getDistrictReadinessAction({
        ...readiness(),
        verificationStatus: "pending",
      }).stage
    ).toBe("create_school");
    expect(
      getDistrictReadinessAction({
        ...readiness(),
        verificationStatus: "rejected",
      }).stage
    ).toBe("district_verification");
  });

  it("creates the first school when the district is empty", () => {
    expect(getDistrictReadinessAction(readiness()).stage).toBe(
      "create_school"
    );
  });

  it("orders rejected correction, admin claim, ownership, and students before pending review", () => {
    expect(
      getDistrictReadinessAction(
        readiness({ verificationStatus: "rejected" })
      ).stage
    ).toBe("school_verification");
    expect(
      getDistrictReadinessAction(
        readiness({
          verificationStatus: "pending",
          activeDelegatedAdmins: 0,
          pendingAdminInvites: 0,
          ownershipTransferred: false,
        })
      ).stage
    ).toBe("invite_admin");
    expect(
      getDistrictReadinessAction(
        readiness({
          activeDelegatedAdmins: 0,
          pendingAdminInvites: 1,
          ownershipTransferred: false,
        })
      ).stage
    ).toBe("await_admin_claim");
    expect(
      getDistrictReadinessAction(
        readiness({ ownershipTransferred: false })
      ).stage
    ).toBe("transfer_ownership");
    expect(
      getDistrictReadinessAction(readiness({ activeStudents: 0 })).stage
    ).toBe("provision_students");
    expect(
      getDistrictReadinessAction(
        readiness({ verificationStatus: "pending" })
      ).stage
    ).toBe("await_platform_verification");
  });

  it("leads with the competitions calendar after every school is ready", () => {
    const next = getDistrictReadinessAction(readiness(baseSchool));
    expect(next.stage).toBe("run_competitions");
    expect(next.href).toBe("/orgs/sample-district/competitions");
    expect(next.label).toBe("Open competitions");
  });

  it("summarizes two districts independently with their next actions", () => {
    const districtA = getDistrictReadinessSummary({
      districtId: "district-a",
      districtSlug: "district-a",
      verificationStatus: "verified",
      schools: [
        { ...baseSchool, id: "school-a-1", slug: "school-a-1" },
        {
          ...baseSchool,
          id: "school-a-2",
          slug: "school-a-2",
          activeStudents: 0,
        },
      ],
    });
    const districtB = getDistrictReadinessSummary({
      districtId: "district-b",
      districtSlug: "district-b",
      verificationStatus: "verified",
      schools: [],
    });

    expect(districtA).toMatchObject({
      totalSchools: 2,
      readySchools: 1,
      nextAction: { stage: "provision_students", schoolId: "school-a-2" },
    });
    expect(districtB).toMatchObject({
      totalSchools: 0,
      readySchools: 0,
      nextAction: { stage: "create_school", schoolId: null },
    });
  });

  it("returns plain per-school status and direct resolution links", () => {
    const waiting = getDistrictSchoolReadinessStatus(
      {
        ...baseSchool,
        activeDelegatedAdmins: 0,
        pendingAdminInvites: 1,
        ownershipTransferred: false,
      },
      "sample-district"
    );
    expect(waiting.label).toBe("Awaiting administrator claim");
    expect(waiting.href).toContain("setup=school-admin");
    expect(waiting.ready).toBe(false);

    const pendingOnly = getDistrictSchoolReadinessStatus(
      { ...baseSchool, verificationStatus: "pending" },
      "sample-district"
    );
    expect(pendingOnly.label).toBe("Setup ready · platform review pending");
    expect(pendingOnly.href).toBe("/orgs/lincoln-middle-school");
    expect(pendingOnly.ready).toBe(false);

    const ready = getDistrictSchoolReadinessStatus(
      baseSchool,
      "sample-district"
    );
    expect(ready.label).toBe("Ready for pilot");
    expect(ready.ready).toBe(true);
  });
});

describe("district command center competitions calendar", () => {
  it("lists upcoming district and school events on overview after setup", () => {
    const overview = readFileSync(
      resolve(process.cwd(), "app/orgs/[slug]/page.tsx"),
      "utf8"
    );
    expect(overview).toContain("Upcoming across the district");
    expect(overview).toContain("Create a district-wide competition");
    expect(overview).toContain("See all competitions");
    expect(overview).toContain("getOrgCompetitionWorkspace(org)");
  });
});

describe("district school bulk verification guardrails", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/0034_bulk_district_school_verification.sql"
    ),
    "utf8"
  );
  const adminActions = readFileSync(
    resolve(process.cwd(), "lib/actions/admin.ts"),
    "utf8"
  );
  const schoolForm = readFileSync(
    resolve(process.cwd(), "components/DistrictSchoolForm.tsx"),
    "utf8"
  );

  it("requires one verified parent and pending child schools", () => {
    expect(migration).toContain("verified_parent_district_required");
    expect(migration).toContain("district.verification_status = 'verified'");
    expect(migration).toContain("school.parent_org_id = p_district_id");
    expect(migration).toContain("school.type = 'school'");
    expect(migration).toContain("school.verification_status = 'pending'");
  });

  it("records every bulk decision in the existing review table", () => {
    expect(migration).toContain(
      "insert into public.organization_verification_reviews"
    );
    expect(migration).toContain("reviewed_by");
    expect(migration).toContain("reviewed_at");
    expect(adminActions).toContain(
      'supabase.rpc(\n    "bulk_verify_district_schools"'
    );
  });

  it("routes new schools directly into administrator delegation", () => {
    expect(schoolForm).toContain(
      "/people?setup=school-admin&district="
    );
  });
});
