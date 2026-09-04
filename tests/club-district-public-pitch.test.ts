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
    expect(clubsPage).toContain("Start a club");
    expect(clubsPage).toContain("START_CLUB_SIGNUP_HREF");
    expect(clubsPage).not.toContain("Create a club account");
    expect(clubsPage).toContain("PageBackLink");
    expect(districtsPage).toContain("PageBackLink");
    expect(read("components/PageBackLink.tsx")).toContain('className="page-back"');
    expect(read("app/globals.css")).toContain(".page-back {");
    expect(clubsPage).toContain("Club/Team-only");
    expect(clubsPage).not.toContain("School/District");
    expect(clubsPage).not.toContain("Book a district");
    expect(clubsPage).toContain("Needs for a professional club");
    expect(clubsPage).toContain("Not building unless you ask");
    expect(clubsPage).toContain("lg:grid-cols-2");
    expect(clubsPage).toContain("lg:grid-rows-subgrid");
    expect(clubsPage).toContain("Announcements");
    expect(clubsPage).toContain("Website and meeting note");
    expect(clubsPage).toContain("Recurring practice nights");
    expect(clubsPage).toContain("A public club directory");
    expect(clubsPage).toContain("Live USCF/NSDA lookup");
    expect(clubsPage).toContain("Pairings/ballots");
    expect(clubsPage).toContain("Dues");
    expect(clubsPage).toContain("does not collect student dues or tournament entry");
    expect(clubsPage).not.toContain("No billing or Stripe");
    expect(clubsPage).toContain("Coach–parent DMs");
  });

  it("keeps the district pitch as an assisted School/District pilot", () => {
    expect(districtsPage).toContain("Book a district pilot conversation");
    expect(districtsPage).toContain("There is no instant district signup");
    expect(districtsPage).not.toContain("Create a club account");
    expect(districtsPage).not.toContain("START_CLUB_SIGNUP_HREF");
    expect(districtsPage).toContain("href=\"/clubs\"");
  });

  it("exposes both buyer paths from home and the footer", () => {
    expect(homePage).toContain('href="/clubs"');
    expect(homePage).toContain('href="/districts"');
    expect(homePage).toContain("Run a club or team");
    expect(homePage).toContain("Chess for a district");
    expect(homePage).not.toContain("Find a tournament");
    expect(layout).toContain('href="/clubs"');
    expect(layout).toContain("Clubs and teams");
    expect(proxy).toContain('"/clubs"');
  });

  it("hands the header brand off on home, clubs, and districts heroes", () => {
    const header = read("components/SiteHeader.tsx");
    expect(header).toContain('"/districts"');
    expect(header).toContain('"/clubs"');
    expect(header).toContain("[data-hero-brand]");
    expect(homePage).toContain("data-hero-brand");
    expect(clubsPage).toContain("data-hero-brand");
    expect(districtsPage).toContain("data-hero-brand");
  });

  it("houses public H1s and lists unfinished district work without fake badges", () => {
    expect(clubsPage).toContain(
      "rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
    );
    expect(clubsPage).toContain("text-display md:text-display-lg");
    expect(clubsPage).toContain("lg:py-10");
    expect(clubsPage).not.toContain("lg:py-12");
    expect(clubsPage).not.toContain("Coming soon");
    expect(clubsPage).not.toContain("Beta");

    expect(districtsPage).toContain("Price and support");
    expect(districtsPage).toContain("Privacy, retention, and security");
    expect(districtsPage).toContain("Email at school volume");
    expect(districtsPage).toContain("Independent clubs");
    expect(districtsPage).toContain("See the club workspace");
    expect(districtsPage).toContain("rounded-3xl");
    expect(districtsPage).toContain("text-display md:text-display-lg");
    expect(districtsPage).not.toContain("Coming soon");
    expect(districtsPage).not.toContain("Beta");
  });

  it("keeps sign-in as sign-in, not a role chooser", () => {
    const loginPage = read("app/login/page.tsx");
    expect(loginPage).not.toContain("/signup?role=");
    expect(loginPage).toContain("Create staff account");
    expect(read("components/LoginForm.tsx")).toContain("Create an account");
  });
});
