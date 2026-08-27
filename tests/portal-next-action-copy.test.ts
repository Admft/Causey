import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPEN_COMPETITIONS_LABEL,
  OPEN_MY_CLUBS_LABEL,
  SEARCH_TOURNAMENTS_LABEL,
  accountOrganizationsEmptyCta,
  organizationNavLabels,
  orgCompetitionsHref,
  workspaceOpenCta,
} from "@/lib/portal-copy";

const portalPrimitives = readFileSync(
  resolve(process.cwd(), "components/PortalPrimitives.tsx"),
  "utf8"
);
const authNav = readFileSync(
  resolve(process.cwd(), "components/AuthNav.tsx"),
  "utf8"
);
const alreadySignedIn = readFileSync(
  resolve(process.cwd(), "components/AlreadySignedInSignup.tsx"),
  "utf8"
);
const homeAccountPitch = readFileSync(
  resolve(process.cwd(), "components/HomeAccountPitch.tsx"),
  "utf8"
);
const accountPage = readFileSync(
  resolve(process.cwd(), "app/account/page.tsx"),
  "utf8"
);
const notificationsPage = readFileSync(
  resolve(process.cwd(), "app/me/notifications/page.tsx"),
  "utf8"
);
const mePage = readFileSync(resolve(process.cwd(), "app/me/page.tsx"), "utf8");
const rosterPage = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/roster/page.tsx"),
  "utf8"
);
const reportsPage = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/reports/page.tsx"),
  "utf8"
);
const activityPage = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/activity/page.tsx"),
  "utf8"
);
const orgOverview = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/page.tsx"),
  "utf8"
);

describe("portal next-action vocabulary", () => {
  it("keeps AuthNav labels aligned with organizationNavLabels", () => {
    expect(organizationNavLabels().label).toBe("My organizations");
    expect(organizationNavLabels().shortLabel).toBe("Orgs");
    expect(organizationNavLabels({ hasDistrictAccess: true }).label).toBe(
      "Districts & schools"
    );
    expect(organizationNavLabels({ hasDistrictAccess: true }).shortLabel).toBe(
      "District"
    );
    expect(authNav).toContain("organizationNavLabels");
  });

  it("names role workspace CTAs the same way as the header", () => {
    expect(workspaceOpenCta("parent")).toEqual({
      href: "/family",
      label: "Open Family",
    });
    expect(workspaceOpenCta("student")).toEqual({
      href: "/me",
      label: "Open Plan",
    });
    expect(workspaceOpenCta("coach")).toEqual({
      href: "/orgs",
      label: "Open my organizations",
    });
    expect(workspaceOpenCta("coach", { hasDistrictAccess: true })).toEqual({
      href: "/orgs",
      label: "Open Districts & schools",
    });
    expect(accountOrganizationsEmptyCta({ role: "student", canCreate: false }))
      .toEqual({ href: "/orgs", label: OPEN_MY_CLUBS_LABEL });
    expect(
      accountOrganizationsEmptyCta({ role: "coach", canCreate: true })
    ).toEqual({ href: "/orgs/new", label: "Create an organization" });
    expect(orgCompetitionsHref("lincoln")).toBe("/orgs/lincoln/competitions");
    expect(OPEN_COMPETITIONS_LABEL).toBe("Open competitions");
    expect(SEARCH_TOURNAMENTS_LABEL).toBe("Search tournaments");
  });

  it("shares PortalErrorState for fail-closed district loads", () => {
    expect(portalPrimitives).toContain("export function PortalErrorState");
    expect(portalPrimitives).toContain('role="alert"');
    expect(activityPage).toContain("PortalErrorState");
    expect(activityPage).toContain("Retry district activity");
    expect(reportsPage).toContain("PortalErrorState");
    expect(reportsPage).toContain("Retry district reporting");
    expect(orgOverview).toContain("PortalErrorState");
    expect(orgOverview).toContain("Retry school readiness");
  });

  it("wires shared workspace CTAs into account, alerts, home, and signup gates", () => {
    expect(alreadySignedIn).toContain("workspaceOpenCta");
    expect(homeAccountPitch).toContain("workspaceOpenCta");
    expect(homeAccountPitch).toContain("SEARCH_TOURNAMENTS_LABEL");
    expect(homeAccountPitch).toContain(
      "Find events by zip, including tournaments clubs publish here."
    );
    expect(homeAccountPitch).not.toContain("Indexed feeds");
    expect(accountPage).toContain("workspaceOpenCta");
    expect(accountPage).toContain("accountOrganizationsEmptyCta");
    expect(accountPage).toContain("PortalEmptyState");
    expect(accountPage).toContain("No parent links yet");
    expect(notificationsPage).toContain("workspaceOpenCta");
    expect(mePage).toContain('label: "Open my organizations"');
    expect(mePage).not.toContain('label: "Manage organizations"');
  });

  it("points school roster and reports at competitions, not vague workspace back-links", () => {
    expect(rosterPage).toContain("OPEN_COMPETITIONS_LABEL");
    expect(rosterPage).toContain("orgCompetitionsHref");
    expect(rosterPage).toContain("Roster is ready for competitions");
    expect(rosterPage).toContain("Open invites &amp; staff");
    expect(reportsPage).toContain("OPEN_COMPETITIONS_LABEL");
    expect(reportsPage).toContain("orgCompetitionsHref");
    expect(reportsPage).not.toContain("Open hosted tournaments");
  });
});
