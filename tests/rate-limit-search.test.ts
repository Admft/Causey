import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const rateLimit = read("lib/rate-limit.ts");
const competitions = read("app/api/competitions/route.ts");
const geo = read("app/api/geo/nearest-zip/route.ts");
const searchClient = read("components/SearchClient.tsx");
const p1Sql = read("supabase/migrations/0069_p1_isolation_email_comments.sql");

describe("search rate limit does not lie about throttling", () => {
  it("sends an IP-shaped RPC key and cookie JWT so 0069 cannot reject signed-in search", () => {
    expect(p1Sql).toContain("^ip:[a-f0-9]{64}$");
    expect(rateLimit).toContain("HASHED_IP_ACTOR");
    expect(rateLimit).toContain("hashedIpActorKey");
    expect(rateLimit).toContain("createServerSupabaseClient");
    expect(rateLimit).not.toContain("getSupabaseClient");
    expect(competitions).toContain("hashedRequestActorKey(null, request.headers)");
    expect(competitions).not.toContain("hashedRequestActorKey(user?.id)");
    expect(geo).toContain("hashedRequestActorKey(null, request.headers)");
    expect(geo).not.toContain("getSessionUser");
  });

  it("fails open for search and geo when the limiter RPC errors, and fails closed for abuse writes", () => {
    expect(rateLimit).toContain('"search"');
    expect(rateLimit).toContain('"geo"');
    expect(rateLimit).toContain("FAIL_OPEN_ON_LIMITER_ERROR");
    expect(rateLimit).toContain("reportError(error, `consume_rate_limit ${bucket}`)");
    expect(rateLimit).toContain("return failOpen");
    expect(rateLimit).toContain('"signup"');
    expect(rateLimit).toContain('"join_code"');
    expect(rateLimit).toContain('"claim"');
    expect(rateLimit).toContain('"csv_import"');
    expect(rateLimit).toContain('"comment"');
  });

  it("lets a family retry tournament search from the error panel", () => {
    expect(searchClient).toContain("Try search again");
    expect(searchClient).toContain("setRetryNonce");
  });
});
