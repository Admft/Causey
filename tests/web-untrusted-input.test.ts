import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CompetitionSchema } from "@/lib/schemas";
import { externalUrlHost, safeExternalUrl } from "@/lib/safe-url";
import { TournamentCreateSchema } from "@/lib/validation/tournament";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/**
 * The phone app routes every scraped organizer link through one guard. These
 * cover the same ground on the website, where the same URLs land in an href on
 * a page anyone can open.
 */
describe("untrusted URLs never reach an href", () => {
  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://files.example/reg",
    "https://user:password@example.com/register",
    "http://localhost/register",
    "http://127.0.0.1/register",
    "http://10.1.2.3/register",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/register",
    "https://registration.internal/register",
    "not a url at all",
    "",
  ])("refuses %s", (raw) => {
    expect(safeExternalUrl(raw)).toBeNull();
    expect(externalUrlHost(raw)).toBeNull();
  });

  it("passes ordinary organizer links through unchanged", () => {
    expect(safeExternalUrl("https://register.example/path")).toBe(
      "https://register.example/path"
    );
    expect(safeExternalUrl("http://register.example/path")).toBe(
      "http://register.example/path"
    );
    expect(externalUrlHost("https://www.uschess.org/tournament")).toBe(
      "uschess.org"
    );
  });

  it("treats a null or absent link as no link", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it("guards the pathway panel's organizer link", () => {
    const source = read("components/PathwayStatusPanel.tsx");
    expect(source).toContain("safeExternalUrl(sourceUrl)");
    expect(source).toContain("href={organizerHref}");
    // The raw prop must not be the thing in the href.
    expect(source).not.toContain("href={sourceUrl}");
  });

  it("guards the moderation queue's organizer link", () => {
    const source = read("components/AdminModerationBulkQueue.tsx");
    expect(source).not.toContain("href={tournament.reg_url}");
    expect(source).toContain("safeExternalUrl(tournament.reg_url)");
  });

  it("guards the organization website link", () => {
    const source = read("app/orgs/[slug]/page.tsx");
    expect(source).not.toContain("href={org.website_url}");
    expect(source).toContain("safeExternalUrl(org.website_url)");
  });

  it("gates the event page's register step on a usable link", () => {
    const source = read("app/event/[slug]/page.tsx");
    // A bare `new URL(reg_url)` threw the whole page on an unparseable value.
    expect(source).not.toContain("new URL(competition.reg_url)");
    expect(source).toContain("safeExternalUrl(competition.reg_url)");
    expect(source).toContain('primaryAction === "register" && registrationUrl');
  });
});

describe("unsafe URLs cannot be stored", () => {
  const listing = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "example-open",
    name: "Example Open",
    organizer_name: null,
    venue_name: "Community Center",
    address: "1 Main St",
    city: "Dallas",
    state: "TX",
    zip: "75201",
    lat: 32.7767,
    lng: -96.797,
    start_date: "2026-10-01",
    end_date: null,
    reg_deadline: null,
    entry_fee_cents: null,
    rated: false,
    series_id: null,
    source: "manual",
  };

  it("nulls a javascript: registration link instead of dropping the listing", () => {
    const parsed = CompetitionSchema.safeParse({
      ...listing,
      reg_url: "javascript:alert(1)",
      source_url: "javascript:alert(1)",
      image_url: "javascript:alert(1)",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reg_url).toBeNull();
    expect(parsed.data.source_url).toBeNull();
    expect(parsed.data.image_url).toBeNull();
  });

  it("keeps a real registration link byte-for-byte", () => {
    const parsed = CompetitionSchema.safeParse({
      ...listing,
      reg_url: "https://register.example/open?section=k12",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reg_url).toBe(
      "https://register.example/open?section=k12"
    );
  });

  it("tells a host their registration link is not usable", () => {
    const values = {
      orgId: "22222222-2222-4222-8222-222222222222",
      orgSlug: "example-club",
      category: "chess",
      customCategoryName: "",
      participationMode: "in_person",
      name: "Fall Scholastic",
      startDate: "2026-10-01",
      endDate: null,
      regDeadline: null,
      venueName: "Community Center",
      address: "1 Main St",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      entryFeeCents: null,
      visibility: "public",
      rated: false,
    };

    const unsafe = TournamentCreateSchema.safeParse({
      ...values,
      regUrl: "javascript:alert(1)",
    });
    expect(unsafe.success).toBe(false);
    if (unsafe.success) return;
    expect(unsafe.error.issues[0]?.message).toContain("http");

    const safe = TournamentCreateSchema.safeParse({
      ...values,
      regUrl: "https://register.example/fall",
    });
    expect(safe.success).toBe(true);
  });
});
