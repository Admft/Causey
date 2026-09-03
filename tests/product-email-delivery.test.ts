import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const migration = read("supabase/migrations/0036_product_email_delivery.sql");
const delivery = read("lib/email/delivery.ts");
const enqueue = read("lib/email/enqueue.ts");
const cronRoute = read("app/api/cron/product-email/route.ts");
const vercelConfig = read("vercel.json");

describe("product email delivery", () => {
  it("keeps address lookup and queue claiming service-role only", () => {
    expect(migration).toContain("claim_email_outbox_batch");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("get_email_reminder_candidates");
    expect(migration).toContain("get_guardian_email_recipients");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("uses stable idempotency keys and records provider delivery IDs", () => {
    expect(delivery).toContain("idempotencyKey:");
    expect(delivery).toContain("provider_message_id");
    expect(delivery).toContain('status: "sent"');
    expect(delivery).toContain('status: "failed"');
  });

  it("honors user preferences and routes student alerts to active guardians", () => {
    expect(enqueue).toContain("prefersEmailKind");
    expect(enqueue).toContain('profileRole !== "student"');
    expect(enqueue).toContain("guardianRouting");
    expect(migration).toContain("h.status = 'active'");
  });

  it("protects and schedules the product email worker", () => {
    expect(cronRoute).toContain("timingSafeEqual");
    expect(cronRoute).toContain("process.env.CRON_SECRET");
    expect(cronRoute).toContain("while (Date.now() < deadline)");
    expect(cronRoute).toContain("280_000");
    expect(cronRoute).toContain("remaining");
    expect(vercelConfig).toContain("/api/cron/product-email");
  });
});
