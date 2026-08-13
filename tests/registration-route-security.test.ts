import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeOrganizerRegistrationUrl } from "@/lib/actions/registration-redirect";

const mocks = vi.hoisted(() => ({
  getCompetitionBySlug: vi.fn(),
  getCompetitionBySlugAuthed: vi.fn(),
  getSessionUser: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getDataSource: () => ({
    getCompetitionBySlug: mocks.getCompetitionBySlug,
  }),
}));
vi.mock("@/lib/data/portal", () => ({
  getCompetitionBySlugAuthed: mocks.getCompetitionBySlugAuthed,
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

describe("organizer registration redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCompetitionBySlug.mockResolvedValue({
      id: "competition-1",
      reg_url: "https://registration.example/tournament",
    });
    mocks.getCompetitionBySlugAuthed.mockResolvedValue(null);
    mocks.getSessionUser.mockResolvedValue({ id: "parent-1" });
  });

  it.each([
    "javascript:alert(1)",
    "https://user:password@example.com/register",
    "http://localhost/register",
    "http://127.0.0.1/register",
    "http://10.1.2.3/register",
    "http://[::1]/register",
    "https://registration.internal/register",
  ])("rejects unsafe organizer URL %s", (url) => {
    expect(safeOrganizerRegistrationUrl(url)).toBeNull();
  });

  it("accepts ordinary public http and https destinations", () => {
    expect(safeOrganizerRegistrationUrl("https://register.example/path")).toBe(
      "https://register.example/path"
    );
    expect(safeOrganizerRegistrationUrl("http://register.example/path")).toBe(
      "http://register.example/path"
    );
  });

  it("does not stamp any account for a malformed child target", async () => {
    const from = vi.fn();
    mocks.createServerSupabaseClient.mockResolvedValue({ from });
    const { GET } = await import("@/app/event/[slug]/register/route");

    const response = await GET(
      new Request("https://causey.example/event/open/register?for=not-a-uuid"),
      { params: Promise.resolve({ slug: "open" }) }
    );

    expect(response.headers.get("location")).toBe(
      "https://registration.example/tournament"
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed for a missing or revoked child link", async () => {
    const linkQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    linkQuery.select.mockReturnValue(linkQuery);
    linkQuery.eq.mockReturnValue(linkQuery);
    linkQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    const from = vi.fn(() => linkQuery);
    mocks.createServerSupabaseClient.mockResolvedValue({ from });
    const { GET } = await import("@/app/event/[slug]/register/route");

    const response = await GET(
      new Request(
        "https://causey.example/event/open/register?for=11111111-1111-4111-8111-111111111111"
      ),
      { params: Promise.resolve({ slug: "open" }) }
    );

    expect(response.headers.get("location")).toBe(
      "https://registration.example/tournament"
    );
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("household_links");
  });
});
