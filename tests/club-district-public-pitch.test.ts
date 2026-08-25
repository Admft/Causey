import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const clubsPage = read("app/clubs/page.tsx");
const districtsPage = read("app/districts/page.tsx");
const homePage = read("app/page.tsx");
const layout = read("app/layout.tsx");
const proxy = read("proxy.ts");

describe("club and district public pitches", () => {
  it("gives clubs a peer surface to /districts with Club/Team language", () => {
    expect(clubsPage).toContain("A club season, from roster to results.");
    expect(clubsPage).toContain("Create a club account");
    expect(clubsPage).toContain("/signup?role=coach");
    expect(clubsPage).toContain("Club/Team-only");
    expect(clubsPage).not.toContain("School/District");
    expect(clubsPage).not.toContain("Book a district");
    expect(clubsPage).toContain("Needs for a professional club");
    expect(clubsPage).toContain("Not building unless you ask");
    expect(clubsPage).toContain("Recurring practice nights");
    expect(clubsPage).toContain("A public club directory");
    expect(clubsPage).toContain("Live USCF/NSDA lookup");
    expect(clubsPage).toContain("Pairings/ballots");
    expect(clubsPage).toContain("Dues");
    expect(clubsPage).toContain("Coach–parent DMs");
  });

  it("keeps the district pitch as an assisted School/District pilot", () => {
    expect(districtsPage).toContain("Book a district pilot conversation");
    expect(districtsPage).toContain("There is no instant district signup");
    expect(districtsPage).not.toContain("Create a club account");
    expect(districtsPage).toContain("href=\"/clubs\"");
  });

  it("exposes both buyer paths from home and the footer", () => {
    expect(homePage).toContain('href: "/clubs"');
    expect(homePage).toContain('href: "/districts"');
    expect(layout).toContain('href="/clubs"');
    expect(layout).toContain("Clubs and teams");
    expect(proxy).toContain('"/clubs"');
  });
});
