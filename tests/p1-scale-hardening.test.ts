import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const p1Sql = read("supabase/migrations/0069_p1_isolation_email_comments.sql");
const session = read("lib/auth/session.ts");
const proxy = read("proxy.ts");
const enqueue = read("lib/email/enqueue.ts");
const delivery = read("lib/email/delivery.ts");
const districtActions = read("lib/actions/district.ts");
const stemPage = read("app/stem/page.tsx");
const eventPage = read("app/event/[slug]/page.tsx");
const rateLimitSql = p1Sql;
const commentsActions = read("lib/actions/comments.ts");

describe("P1 scale hardening", () => {
  it("binds rate-limit actors to auth.uid() or a hashed IP", () => {
    expect(rateLimitSql).toContain("resolved_actor := 'user:' || auth.uid()::text");
    expect(rateLimitSql).toContain("^ip:[a-f0-9]{64}$");
  });

  it("bounds reminder and notification enqueue and counts remaining outbox", () => {
    expect(p1Sql).toContain("get_email_reminder_candidates(");
    expect(p1Sql).toContain("limit least(greatest(coalesce(p_limit, 500), 1), 2000)");
    expect(p1Sql).toContain("get_pending_notification_emails(");
    expect(p1Sql).toContain("count_ready_email_outbox");
    expect(p1Sql).toContain("claim_email_outbox_invitations");
    expect(enqueue).toContain("p_limit: 500");
    expect(enqueue).toContain("p_limit: 200");
    expect(delivery).toContain("count_ready_email_outbox");
    expect(delivery).toContain("flushPendingInvitationEmails");
    expect(districtActions).toContain("flushPendingInvitationEmails");
  });

  it("memoizes session reads and skips Auth getUser without a cookie", () => {
    expect(session).toContain('from "react"');
    expect(session).toContain("export const getSessionUser = cache(");
    expect(session).toContain("export const getCurrentProfile = cache(");
    expect(session).toContain("hasSupabaseAuthCookie");
    expect(proxy).toContain('"/login"');
  });

  it("keeps STEM metadata honest and does not treat missing reg_url as a club invite", () => {
    expect(stemPage).toContain("Purple Comet");
    expect(stemPage).toContain("Congressional App Challenge");
    expect(stemPage).not.toContain("VEX robotics");
    expect(eventPage).toContain("No registration link listed");
    expect(eventPage).not.toContain("Entry is by club invitation");
    expect(eventPage).not.toContain("This event is hosted on Causey");
  });

  it("hides reported comments and blocks under-13 posts", () => {
    expect(p1Sql).toContain("report_competition_comment");
    expect(p1Sql).toContain("comment_under_13");
    expect(p1Sql).toContain("hidden_at");
    expect(commentsActions).toContain("reportCompetitionComment");
    expect(commentsActions).toContain("canPostPublicComments");
  });
});
