import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  goingReason,
  hostedReason,
  HOME_MY_TOURNAMENTS_LIMIT,
  HOME_MY_TOURNAMENTS_LOGIN_HREF,
  HOME_MY_TOURNAMENTS_PATH,
  HOME_MY_TOURNAMENTS_SIGNUP_HREF,
  homeMyTournamentsEmptyCopy,
  invitedReason,
  isHomeMyTournamentsView,
  mergeHomeMyTournamentRows,
  travelingReason,
  type HomeMyTournamentRow,
} from "@/lib/home-my-tournaments";

function row(
  partial: Partial<HomeMyTournamentRow> &
    Pick<HomeMyTournamentRow, "competitionId" | "kind" | "startDate">
): HomeMyTournamentRow {
  return {
    slug: partial.slug ?? partial.competitionId,
    name: partial.name ?? partial.competitionId,
    meta: partial.meta ?? "Sep 1, 2026",
    reason: partial.reason ?? partial.kind,
    ...partial,
  };
}

describe("home my-tournaments preview", () => {
  it("opens My tournaments after sign-in via a safe next path", () => {
    expect(HOME_MY_TOURNAMENTS_PATH).toBe("/?view=mine");
    expect(isHomeMyTournamentsView("mine")).toBe(true);
    expect(isHomeMyTournamentsView("find")).toBe(false);
    expect(HOME_MY_TOURNAMENTS_LOGIN_HREF).toBe(
      `/login?next=${encodeURIComponent("/?view=mine")}`
    );
    expect(HOME_MY_TOURNAMENTS_SIGNUP_HREF).toBe(
      `/signup?next=${encodeURIComponent("/?view=mine")}`
    );
  });

  it("labels Going and Needs RSVP without calling them registration", () => {
    expect(goingReason()).toBe("Going");
    expect(goingReason("Ada")).toBe("Going · Ada");
    expect(invitedReason()).toBe("Needs RSVP");
    expect(invitedReason("Ada")).toBe("Needs RSVP · Ada");
    expect(goingReason()).not.toMatch(/registered/i);
    expect(invitedReason()).not.toMatch(/registered/i);
  });

  it("uses Club/Team vs School/District nouns for traveling and hosted rows", () => {
    expect(travelingReason("club")).toBe("Your club is traveling");
    expect(travelingReason("team")).toBe("Your team is traveling");
    expect(travelingReason("school")).toBe("Your school is traveling");
    expect(travelingReason("district")).toBe("Your district is traveling");
    expect(hostedReason("North Chess Club")).toBe("Hosted by North Chess Club");
    expect(homeMyTournamentsEmptyCopy("coach", true).title).toContain(
      "school or district"
    );
    expect(homeMyTournamentsEmptyCopy("coach", true).title).not.toContain(
      "club"
    );
    expect(homeMyTournamentsEmptyCopy("coach", false).title).toContain("club");
    expect(homeMyTournamentsEmptyCopy("parent", false).title).toContain(
      "students"
    );
  });

  it("dedupes by event, prefers Going over traveling over hosted, and caps the list", () => {
    const merged = mergeHomeMyTournamentRows([
      row({
        competitionId: "a",
        kind: "hosted",
        startDate: "2026-10-01",
        reason: "Hosted by Club",
      }),
      row({
        competitionId: "a",
        kind: "going",
        startDate: "2026-10-01",
        reason: "Going",
      }),
      row({
        competitionId: "a",
        kind: "traveling",
        startDate: "2026-10-01",
        reason: "Your club is traveling",
      }),
      row({
        competitionId: "b",
        kind: "invited",
        startDate: "2026-09-01",
        reason: "Needs RSVP",
      }),
      ...Array.from({ length: 8 }, (_, index) =>
        row({
          competitionId: `extra-${index}`,
          kind: "hosted",
          startDate: `2026-11-0${index + 1}`,
        })
      ),
    ]);
    expect(merged[0]?.competitionId).toBe("b");
    expect(merged.find((item) => item.competitionId === "a")?.kind).toBe(
      "going"
    );
    expect(merged).toHaveLength(HOME_MY_TOURNAMENTS_LIMIT);
  });

  it("loads the preview from existing portal RSVP and org attendance reads", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/data/home-my-tournaments.ts"),
      "utf8"
    );
    expect(source).toContain("getMyEntrantRows");
    expect(source).toContain("getChildrenWithEvents");
    expect(source).toContain("getOrgAttendedEvents");
    expect(source).toContain("getMyOrgs");
    expect(source).not.toContain("saved_competitions");
  });
});
