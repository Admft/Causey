import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile saved listings", () => {
  it("toggles bookmarks on saved_competitions", () => {
    const route = read("app/api/mobile/saved/route.ts");
    expect(route).toContain("getMobileAuth");
    expect(route).toContain("auth.access.allowed");
    expect(route).toContain("saved_competitions");
    expect(route).toContain("competitionId");
    expect(route).toContain(".delete()");
    expect(route).toContain(".insert(");
    expect(route).toContain("user_id");
    expect(route).toContain("competition_id");
    expect(route).toContain("{ saved: false }");
    expect(route).toContain("{ saved: true }");
  });

  it("GET lists joined competitions, upcoming first", () => {
    const route = read("app/api/mobile/saved/route.ts");
    expect(route).toContain(
      "competition_id, competitions(slug, name, category, city, state, start_date, end_date)"
    );
    expect(route).toContain("upcomingFirst");
    expect(route).toContain("{ saved }");
    expect(route).toContain('status: 403');
  });

  it("save button is a bookmark, not Going or RSVP", () => {
    const button = read("mobile/src/SaveEventButton.tsx");
    expect(button).toContain("competitionId");
    expect(button).toContain("initiallySaved");
    expect(button).toContain("causeyFetch");
    expect(button).toContain("/api/mobile/saved");
    expect(button).toContain("Sign in to save this listing");
    expect(button).toContain('router.push("/login")');
    expect(button).toContain("Save listing");
    expect(button).toContain("Saved — tap to remove");
    expect(button).not.toMatch(/Going/);
    expect(button).not.toMatch(/RSVP/i);
    expect(button).not.toContain("rating");
    expect(button).not.toContain("comment");
  });

  it("is mounted on the tournament screen and reachable from Me", () => {
    expect(read("mobile/app/event/[slug].tsx")).toContain("SaveEventButton");
    expect(read("mobile/app/_layout.tsx")).toContain('name="saved"');
    expect(read("mobile/app/(tabs)/me.tsx")).toContain('router.push("/saved")');
  });

  it("saved screen fetches /api/mobile/saved and opens the listing", () => {
    const screen = read("mobile/app/saved.tsx");
    expect(screen).toContain("/api/mobile/saved");
    expect(screen).toContain("`/event/${slug}`");
    expect(screen).toContain(
      "Saved listings are bookmarks for this account. Open a tournament and"
    );
    expect(screen).toContain("<Screen");
    expect(screen).toContain("header");
    expect(screen).not.toMatch(/Going/);
    expect(screen).not.toMatch(/RSVP/i);
  });
});
