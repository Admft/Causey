import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("GET and POST /api/mobile/join", () => {
  const route = read("app/api/mobile/join/route.ts");
  const write = read("lib/join-write.ts");
  const getFn = route.slice(
    route.indexOf("export async function GET"),
    route.indexOf("export async function POST")
  );
  const postFn = route.slice(route.indexOf("export async function POST"));

  it("exposes GET preview and POST join", () => {
    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function POST");
    expect(getFn).toContain("get_org_preview_by_code");
    expect(postFn).toContain("performJoinOrgWithCode");
  });

  it("previews with the anon key and does not require a session", () => {
    expect(getFn).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(getFn).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(getFn).not.toContain("getMobileAuth");
    expect(getFn).toContain("get_org_preview_by_code");
    expect(getFn).toContain("status: 400");
    expect(getFn).toContain("status: 404");
    expect(getFn).toContain("status: 503");
    expect(route).toContain("We couldn’t check that team code.");
    expect(route).toContain("That code didn’t match an organization.");
  });

  it("fails closed: no account prompt unless a real org resolved", () => {
    expect(getFn).toContain("anonymous preview resolved a real");
    expect(getFn).not.toContain("signup");
    expect(getFn).not.toContain("Create student account");
    expect(getFn).toContain("if (!org)");
    expect(getFn).toContain("status: 404");
  });

  it("joins through the shared write helper after mobile auth", () => {
    expect(postFn).toContain("getMobileAuth");
    expect(postFn).toContain("auth.access.allowed");
    expect(postFn).toContain("status: 403");
    expect(postFn).toContain("performJoinOrgWithCode");
    expect(write).toContain("export async function performJoinOrgWithCode");
    expect(write).toContain("isValidJoinCode");
    expect(write).toContain("normalizeJoinCode");
    expect(write).toContain('"join_code"');
    expect(write).toContain('rpc("join_org_with_code"');
    expect(write).toContain("That code didn’t match an organization.");
    expect(read("lib/actions/orgs.ts")).toContain("performJoinOrgWithCode");
  });
});

describe("mobile/app/join.tsx", () => {
  const screen = read("mobile/app/join.tsx");

  it("uses Field and causeyFetch /api/mobile/join", () => {
    expect(screen).toContain("Field");
    expect(screen).toContain("causeyFetch");
    expect(screen).toContain("/api/mobile/join");
    expect(screen).toContain("<Screen header>");
    expect(screen).toContain("Kicker");
    expect(screen).toContain("Title");
    expect(screen).toContain("Lede");
    expect(screen).toContain("PrimaryButton");
    expect(screen).toContain("ErrorText");
    expect(screen).toContain("Meta");
    expect(screen).toContain("Card");
  });

  it("previews then joins, and only asks to sign in after a real preview", () => {
    expect(screen).toContain("`/api/mobile/join?code=");
    expect(screen).toContain('method: "POST"');
    expect(screen).toContain("useAuth");
    expect(screen).toContain("session");
    expect(screen).toContain('router.push("/login")');
    expect(screen).not.toContain("/signup");
    expect(screen).not.toContain("Create student account");
    expect(screen.toLowerCase()).not.toContain("coming soon");
  });

  it("names Club, Team, or School from org.type", () => {
    expect(screen).toContain('school: "School"');
    expect(screen).toContain('club: "Club"');
    expect(screen).toContain('team: "Team"');
    expect(screen).toContain("kindNoun");
    expect(screen).not.toContain("organization");
  });
});
