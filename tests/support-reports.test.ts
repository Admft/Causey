import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncateSupportAlertBody } from "@/lib/support";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const mocks = vi.hoisted(() => ({
  getPlatformAdminUser: vi.fn(),
  getSessionUser: vi.fn(),
  getServiceRoleClient: vi.fn(),
  consumeRateLimit: vi.fn(),
  hashedRequestActorKey: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdminUser: mocks.getPlatformAdminUser,
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));
vi.mock("@/lib/supabase/client", () => ({
  getServiceRoleClient: mocks.getServiceRoleClient,
}));
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>(
    "@/lib/rate-limit"
  );
  return {
    ...actual,
    consumeRateLimit: mocks.consumeRateLimit,
    hashedRequestActorKey: mocks.hashedRequestActorKey,
  };
});

describe("support problem reports", () => {
  it("stores tickets privately and lets platform admins write Alerts", () => {
    const migration = read("supabase/migrations/0081_support_reports.sql");
    expect(migration).toContain("create table if not exists public.support_reports");
    expect(migration).toContain("support_report_messages");
    expect(migration).toContain("support-attachments");
    expect(migration).toContain("'support'");
    expect(migration).toContain("support_intake");
    expect(migration).toContain("support_reply");
    expect(migration).toContain("p_entity_type = 'support_report'");
    expect(migration).toContain("public.is_platform_admin()");
    expect(migration).not.toContain("direct_message");
  });

  it("puts a Support page form on /support, not a corner chat widget", () => {
    const page = read("app/support/page.tsx");
    const form = read("components/SupportReportForm.tsx");
    const layout = read("app/layout.tsx");
    const actions = read("lib/actions/support.ts");

    expect(page).toContain("Report a problem");
    expect(page).toContain("This is not a live chat");
    expect(page).toContain("Do not send passwords or student records");
    expect(page).toContain("SupportReportForm");
    expect(page).toContain("Your reports");
    expect(form).toContain('type="email"');
    expect(form).toContain("required");
    expect(form).toContain("Send problem report");
    expect(actions).toContain('"support"');
    expect(actions).toContain("submitSupportReport");
    expect(layout).toContain("report a problem");
    expect(layout).toContain("Report a problem");
    expect(layout).toContain('href="/support"');
    expect(layout).not.toMatch(/href="\/support"[\s\S]*?>\s*Support\s*</);
    expect(read("components/AuthNav.tsx")).not.toContain("/support");
    expect(read("app/account/page.tsx")).toContain('href="/support"');
    expect(read("components/LoginForm.tsx")).toContain('href="/support"');
    expect(read("app/error.tsx")).toContain('href="/support"');
    expect(read("mobile/app/(tabs)/me.tsx")).toContain("Report a problem");
    expect(layout).not.toContain("SupportReportForm");
    expect(layout).not.toContain("fixed bottom-4");
    expect(layout).not.toContain("Intercom");
  });

  it("keeps sign-in help as separate jobs, not a middot row", () => {
    const login = read("components/LoginForm.tsx");
    expect(login).toContain('href="/forgot-password"');
    expect(login).toContain("Create an account");
    expect(login).toContain("Report a problem");
    expect(login).not.toContain('{" · "}');
  });

  it("rate-limits support through the expanded consume_rate_limit allowlist", () => {
    const migration = read("supabase/migrations/0081_support_reports.sql");
    const rateLimit = read("lib/rate-limit.ts");
    expect(migration).toContain("'support'");
    expect(rateLimit).toContain('"support"');
    expect(rateLimit).toContain("windowSeconds: 600");
  });

  it("emails the founding inbox with Reply-To and flushes immediately", () => {
    const delivery = read("lib/email/delivery.ts");
    const config = read("lib/email/config.ts");
    const envExample = read(".env.example");
    const actions = read("lib/actions/support.ts");
    expect(config).toContain("CAUSEY_SUPPORT_INBOX");
    expect(config).toContain("amoffat@causey.dev");
    expect(envExample).toContain("CAUSEY_SUPPORT_INBOX");
    expect(delivery).toContain("support_intake");
    expect(delivery).toContain("support_reply");
    expect(delivery).toContain("replyTo");
    expect(actions).toContain("flushPendingInvitationEmails");
    expect(actions).toContain("getSupportInboxEmail");
    expect(read("lib/data/support.ts")).toContain(
      '.eq("reporter_user_id", user.id)'
    );
  });

  it("gates admin replies and truncates Alerts bodies", () => {
    const adminPage = read("app/admin/support/page.tsx");
    const detail = read("app/admin/support/[id]/page.tsx");
    const subnav = read("components/AdminSubnav.tsx");
    expect(adminPage).toContain("Problem reports");
    expect(detail).toContain("AdminSupportReplyForm");
    expect(detail).not.toContain("notFound()");
    expect(detail).toContain("That report isn");
    expect(subnav).toContain('href: "/admin/support"');
    expect(truncateSupportAlertBody("ok")).toBe("ok");
    expect(truncateSupportAlertBody("a".repeat(1001))).toHaveLength(1000);
    expect(truncateSupportAlertBody("a".repeat(1001)).endsWith("...")).toBe(true);
  });
});

describe("support report actions", () => {
  beforeEach(() => {
    mocks.getPlatformAdminUser.mockReset();
    mocks.getSessionUser.mockReset();
    mocks.getServiceRoleClient.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.hashedRequestActorKey.mockReset();
  });

  it("requires a description and a reply email before writing", async () => {
    const { submitSupportReport } = await import("@/lib/actions/support");
    await expect(
      submitSupportReport({ body: "", email: "person@example.com" })
    ).resolves.toEqual({ ok: false, error: "Describe the problem." });
    await expect(
      submitSupportReport({ body: "Search is blank.", email: "not-an-email" })
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.getServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects support replies for non-admins", async () => {
    mocks.getPlatformAdminUser.mockResolvedValue(null);
    const { replyToSupportReport, closeSupportReport } = await import(
      "@/lib/actions/support"
    );
    await expect(
      replyToSupportReport({
        reportId: "00000000-0000-0000-0000-000000000000",
        body: "We are looking into this.",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
    await expect(
      closeSupportReport({
        reportId: "00000000-0000-0000-0000-000000000000",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Platform administrator access required.",
    });
  });
});
