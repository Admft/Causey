import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  competitionAudienceOptions,
  DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE,
  organizationSupportsDistrictAudience,
  resolveCompetitionAudience,
} from "@/lib/competition-audience";

const createForm = readFileSync(
  resolve(process.cwd(), "components/TournamentCreateForm.tsx"),
  "utf8"
);
const createPage = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/competitions/new/page.tsx"),
  "utf8"
);
const editPage = readFileSync(
  resolve(process.cwd(), "app/event/[slug]/edit/page.tsx"),
  "utf8"
);
const tournamentActions = readFileSync(
  resolve(process.cwd(), "lib/actions/tournaments.ts"),
  "utf8"
);
const adminActions = readFileSync(
  resolve(process.cwd(), "lib/actions/admin.ts"),
  "utf8"
);
const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0053_district_audience_requires_hierarchy.sql"
  ),
  "utf8"
);

describe("organizationSupportsDistrictAudience", () => {
  it("allows districts and connected schools only", () => {
    expect(
      organizationSupportsDistrictAudience({
        type: "district",
        parent_org_id: null,
      })
    ).toBe(true);
    expect(
      organizationSupportsDistrictAudience({
        type: "school",
        parent_org_id: "district-1",
      })
    ).toBe(true);
    expect(
      organizationSupportsDistrictAudience({
        type: "school",
        parent_org_id: null,
      })
    ).toBe(false);
    expect(
      organizationSupportsDistrictAudience({
        type: "club",
        parent_org_id: null,
      })
    ).toBe(false);
    expect(
      organizationSupportsDistrictAudience({
        type: "team",
        parent_org_id: null,
      })
    ).toBe(false);
    expect(organizationSupportsDistrictAudience(null)).toBe(false);
  });
});

describe("competitionAudienceOptions", () => {
  it("hides District only when the host has no district hierarchy", () => {
    const withoutDistrict = competitionAudienceOptions(false).map(
      (option) => option.value
    );
    expect(withoutDistrict).toEqual(["public", "school", "invite_only"]);
    expect(withoutDistrict).not.toContain("district");

    const withDistrict = competitionAudienceOptions(true).map(
      (option) => option.value
    );
    expect(withDistrict).toContain("district");
  });
});

describe("resolveCompetitionAudience", () => {
  it("clamps dishonest district drafts back to school or public", () => {
    expect(resolveCompetitionAudience("district", false, "private")).toBe(
      "school"
    );
    expect(resolveCompetitionAudience("district", false, "public")).toBe(
      "public"
    );
    expect(resolveCompetitionAudience("district", true, "private")).toBe(
      "district"
    );
    expect(resolveCompetitionAudience("invite_only", false)).toBe(
      "invite_only"
    );
  });
});

describe("district audience fail-closed wiring", () => {
  it("passes host hierarchy into create and edit forms", () => {
    expect(createPage).toContain("orgType={targetHost.type}");
    expect(createPage).toContain("parentOrgId={targetHost.parentOrgId}");
    expect(editPage).toContain("orgType={org.type}");
    expect(editPage).toContain("parentOrgId={org.parent_org_id}");
    expect(createForm).toContain("competitionAudienceOptions");
    expect(createForm).toContain("organizationSupportsDistrictAudience");
    expect(createForm).toContain(
      "District-only is available after this organization is connected to a"
    );
  });

  it("rejects district audience in organizer and admin write paths", () => {
    expect(tournamentActions).toContain("assertDistrictAudienceAllowed");
    expect(tournamentActions).toContain("DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE");
    expect(adminActions).toContain("organizationSupportsDistrictAudience");
    expect(adminActions).toContain("DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE");
    expect(DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE).toMatch(/connected to a district/i);
  });

  it("enforces hierarchy at the database boundary", () => {
    expect(migration).toContain(
      "enforce_district_audience_requires_hierarchy"
    );
    expect(migration).toContain("before insert or update of audience, org_id");
    expect(migration).toContain("host_type = 'district' or host_parent is not null");
  });
});
