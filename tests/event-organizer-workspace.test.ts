import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("organizer event workspace", () => {
  it("keeps People and Listing in the event workspace, not a public directory", () => {
    const manage = read("app/event/[slug]/manage/page.tsx");
    const edit = read("app/event/[slug]/edit/page.tsx");
    const eventPage = read("app/event/[slug]/page.tsx");
    const subnav = read("components/EventOrganizerSubnav.tsx");

    expect(subnav).toContain('tab: "people" | "listing"');
    expect(subnav).toContain("/manage");
    expect(subnav).toContain("/edit");
    expect(manage).toContain("EventOrganizerSubnav");
    expect(manage).toContain("EventPulseStrip");
    expect(manage).toContain("buildEventPulse");
    expect(manage).toContain("visibleAttendance");
    expect(edit).toContain('tab="listing"');
    expect(eventPage).toContain("Manage event");
    expect(eventPage).not.toContain("Manage entrants");
    expect(eventPage).toContain("EventPulseStrip");
    expect(read("components/EventPulseStrip.tsx")).toContain("StatCluster");
    expect(manage).not.toContain("OrgSubnavBar");
    expect(edit).not.toContain("OrgSubnavBar");
    expect(manage).toContain("PageBackLink");
    expect(edit).toContain("PageBackLink");
    expect(edit).toContain("EventOrganizerSubnav");
  });

  it("titles the workspace from the host org type", () => {
    const copy = read("lib/portal-copy.ts");
    expect(copy).toContain("Manage school event");
    expect(copy).toContain("Manage district event");
    expect(copy).toContain("Manage event");
    expect(read("app/event/[slug]/manage/page.tsx")).toContain(
      "manageEventTitle"
    );
  });

  it("uploads edit covers onto the competition id path", () => {
    const form = read("components/TournamentCreateForm.tsx");
    const validation = read("lib/validation/tournament.ts");
    const mutations = read("lib/data/tournament-mutations.ts");
    expect(form).toContain("edit.competitionId");
    expect(form).toContain("initial?.image_url");
    expect(form).toContain("imageUrl: coverImageUrl");
    expect(validation).toContain("imageUrl");
    expect(mutations).toContain("image_url: values.imageUrl");
  });
});
