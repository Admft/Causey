import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("UI audit follow-ups", () => {
  it("keeps load-more failures separate from loaded search results", () => {
    const search = source("components/SearchClient.tsx");
    expect(search).toContain("setLoadMoreError(");
    expect(search).toContain("Your current results are still available.");
    expect(search).toContain("syncingFromUrl.current");
    expect(search).toContain("if (nextUrl !== currentUrl)");
  });

  it("checks destructive action results before removing UI context", () => {
    const entrants = source("components/EntrantManager.tsx");
    const parentUnlink = source("components/UnlinkChildButton.tsx");
    const recommendation = source("components/DismissRecommendationButton.tsx");

    expect(entrants).toContain("const result = await removeEntrant");
    expect(parentUnlink).toContain("const result = await revokeLink");
    expect(recommendation).toContain("const result = await dismissRecommendation");
    expect(entrants).toContain('role="alert"');
    expect(parentUnlink).toContain('role="alert"');
    expect(recommendation).toContain('role="alert"');
  });

  it("uses native and named controls for audited accessibility paths", () => {
    const pathways = source("components/PathwayExplorer.tsx");
    const reports = source("app/orgs/[slug]/reports/page.tsx");
    const people = source("components/OrganizationPeopleManager.tsx");

    expect(pathways).toContain('type="radio"');
    expect(pathways).not.toContain('role="radio"');
    expect(reports).toContain("<caption");
    expect(reports).toContain('scope="col"');
    expect(reports).toContain('scope="row"');
    expect(people).toContain("CSV roster file");
  });

  it("keeps state-changing text inside visible button treatments", () => {
    const globals = source("app/globals.css");
    const registration = source("components/ExternalRegistrationPanel.tsx");
    const rsvp = source("components/RsvpButtons.tsx");
    const heroSearch = source("components/HomeHeroSearch.tsx");
    const zipCapture = source("components/ZipCaptureField.tsx");
    const mobileUi = source("mobile/src/ui.tsx");
    const mobileGoing = source("mobile/src/EventGoingCard.tsx");
    const mobileSignup = source("mobile/app/signup.tsx");

    expect(globals).toContain(".action-button {");
    expect(globals).toContain("border: 1px solid var(--field-border)");
    expect(globals).not.toContain(".action-button--helper");
    expect(registration).toContain(
      'className="action-button action-button--reversal"'
    );
    expect(rsvp).toContain('className="action-button action-button--reversal"');
    expect(heroSearch).toContain(
      'className="mt-1 text-2xs font-semibold text-brand-blue hover:text-brand-blue-strong hover:underline disabled:opacity-60"'
    );
    expect(zipCapture).toContain(
      'className="text-xs font-semibold text-brand-blue hover:text-brand-blue-strong hover:underline disabled:opacity-60"'
    );
    expect(mobileUi).toContain("export function ActionButton");
    expect(mobileUi).toContain("borderColor: colors.fieldBorder");
    expect(mobileUi).toContain("backgroundColor: colors.surfaceSoft");
    expect(mobileUi).toContain(
      "link: { color: colors.brandRed, fontWeight: \"700\", fontSize: 15 }"
    );
    expect(mobileGoing).toMatch(
      /<ActionButton\s+label="Undo complete mark"/
    );
    expect(mobileSignup).toMatch(
      /<ActionButton\s+label="Use a different email"/
    );
    expect(mobileSignup).toMatch(
      /<LinkButton\s+label="Read the privacy notice"/
    );
  });
});
