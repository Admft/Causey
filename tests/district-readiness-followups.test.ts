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
const joinPreviewGrant = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0040_restore_anon_org_join_preview.sql"
  ),
  "utf8"
);
const foundingTeam = readFileSync(
  resolve(process.cwd(), "lib/founding-team.ts"),
  "utf8"
);
const homeDistrictPitch = readFileSync(
  resolve(process.cwd(), "components/HomeDistrictPitch.tsx"),
  "utf8"
);
const districtsPage = readFileSync(
  resolve(process.cwd(), "app/districts/page.tsx"),
  "utf8"
);

describe("district readiness follow-ups", () => {
  it("fails closed before offering account creation for a join code", () => {
    expect(joinPage).toContain("if (!org) return <NoMatch");
    expect(joinPage).toContain("if (!preview.ok) return <PreviewUnavailable");
    expect(joinPage).toContain("like 2P85-8DZ6");
    expect(joinPage).not.toContain("Join your school or club");
    expect(joinPage).not.toContain("Your coach shared this join link.");
  });

  it("allows unsigned visitors to resolve a current join code", () => {
    expect(joinPreviewGrant).toContain(
      "grant execute on function public.get_org_preview_by_code(text)"
    );
    expect(joinPreviewGrant).toContain("to anon, authenticated");
    expect(joinPreviewGrant).toContain("and o.type <> 'district'");
    expect(joinPreviewGrant).not.toContain("not_authenticated");
  });

  it("uses a separate-device student account handoff", () => {
    expect(familyPage).toContain("<StudentAccountHandoff");
    expect(familyPage).not.toContain('href: "/signup?role=student"');
  });

  it("sends founder conversation CTAs to the booking calendar", () => {
    expect(foundingTeam).toContain("calendar.app.google/AX1fCWGdukco55z47");
    expect(homeDistrictPitch).toContain("FOUNDING_TEAM_MEETING_URL");
    expect(homeDistrictPitch).toContain("Talk with the founding team");
    expect(districtsPage).toContain("FOUNDING_TEAM_MEETING_URL");
    expect(districtsPage).toContain("Book a district pilot conversation");
  });

  it("authorizes district CSV exports and keeps them private", () => {
    expect(exportRoute).toContain("view.isDistrictAdmin");
    expect(exportRoute).toContain('"Cache-Control": "private, no-store"');
    expect(exportRoute).toContain('"Content-Disposition"');
  });
});
