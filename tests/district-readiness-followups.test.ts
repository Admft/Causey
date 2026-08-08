import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const joinPage = readFileSync(
  resolve(process.cwd(), "app/join/[code]/page.tsx"),
  "utf8"
);
const familyPage = readFileSync(
  resolve(process.cwd(), "app/family/page.tsx"),
  "utf8"
);
const exportRoute = readFileSync(
  resolve(process.cwd(), "app/orgs/[slug]/reports/export/route.ts"),
  "utf8"
);

describe("district readiness follow-ups", () => {
  it("fails closed before offering account creation for a join code", () => {
    expect(joinPage).toContain("if (!org) return <NoMatch");
    expect(joinPage).not.toContain("Join your school or club");
    expect(joinPage).not.toContain("Your coach shared this join link.");
  });

  it("uses a separate-device student account handoff", () => {
    expect(familyPage).toContain("<StudentAccountHandoff");
    expect(familyPage).not.toContain('href: "/signup?role=student"');
  });

  it("authorizes district CSV exports and keeps them private", () => {
    expect(exportRoute).toContain("view.isDistrictAdmin");
    expect(exportRoute).toContain('"Cache-Control": "private, no-store"');
    expect(exportRoute).toContain('"Content-Disposition"');
  });
});
