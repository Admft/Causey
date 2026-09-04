import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BILLING_PREVIEW_PATH,
  PORTAL_PREVIEW_PATH,
  isLocalPreviewEnabled,
} from "@/lib/local-preview";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P3 local previews and honesty", () => {
  it("404s billing and portals on every Vercel deploy and stays off public chrome", () => {
    expect(isLocalPreviewEnabled({ VERCEL: "1", NODE_ENV: "development" })).toBe(
      false
    );
    expect(
      isLocalPreviewEnabled({
        VERCEL: "1",
        CAUSEY_BILLING_PREVIEW: "1",
        NODE_ENV: "development",
      })
    ).toBe(false);
    expect(isLocalPreviewEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isLocalPreviewEnabled({
        NODE_ENV: "production",
        CAUSEY_BILLING_PREVIEW: "1",
      })
    ).toBe(true);
    expect(isLocalPreviewEnabled({ NODE_ENV: "development" })).toBe(true);

    for (const file of ["app/billing/page.tsx", "app/portals/page.tsx"]) {
      const page = read(file);
      expect(page).toContain("notFound()");
      expect(page).toContain("isLocalPreviewEnabled");
      expect(page).toContain("robots: { index: false, follow: false }");
      expect(page).toContain('dynamic = "force-dynamic"');
    }

    const layout = read("app/layout.tsx");
    expect(layout).not.toContain(BILLING_PREVIEW_PATH);
    expect(layout).not.toContain(PORTAL_PREVIEW_PATH);
    expect(read("app/clubs/page.tsx")).not.toContain(BILLING_PREVIEW_PATH);
    expect(read("app/clubs/page.tsx")).not.toContain(PORTAL_PREVIEW_PATH);
    expect(read("app/page.tsx")).not.toContain(BILLING_PREVIEW_PATH);
    expect(read("app/page.tsx")).not.toContain(PORTAL_PREVIEW_PATH);
    expect(read("app/districts/page.tsx")).not.toContain(PORTAL_PREVIEW_PATH);
    expect(read("proxy.ts")).toContain('"/billing"');
    expect(read("proxy.ts")).toContain('"/portals"');
    expect(read("package.json")).not.toMatch(/stripe|dodopayments/i);
  });

  it("shows Stripe Checkout without a published price, Dodo, or live CTA", () => {
    const preview = read("components/BillingPreview.tsx");
    expect(preview).toContain("Stripe Checkout");
    expect(preview).toContain("Continue with Stripe");
    expect(preview).toContain("Open Stripe customer portal");
    expect(preview).toContain("Amount not published");
    expect(preview).toContain("cta-enabled disabled:opacity-60");
    expect(preview).toContain("Collected on Stripe Checkout");
    expect(preview).toContain("Families stay free");
    expect(preview).toContain("District contracts");
    expect(preview).toContain("What a paid workspace would gate");
    expect(preview).toContain("Failed payment, then suspend writes");
    expect(preview).not.toMatch(/dodo/i);
    expect(preview).not.toMatch(/\$\d/);
    expect(preview).not.toContain("stripe.com");
  });

  it("keeps January districts on the shared workspace and previews a later portal SKU", () => {
    expect(read("app/districts/page.tsx")).toContain("not a custom portal");
    const preview = read("components/PortalPreview.tsx");
    expect(preview).toContain("District UUID");
    expect(preview).toContain("Fail closed");
    expect(preview).toContain("/admin");
    expect(preview).toContain("if (slug ===");
    expect(preview).toContain("Host-only");
    expect(preview).toContain("unsold later SKU");
    expect(preview).not.toMatch(/\$\d/);
    expect(preview).not.toMatch(/dodo/i);
    expect(read("app/orgs/[slug]/settings/page.tsx")).toContain(
      "Open portal layout"
    );
  });

  it("splits student dues from a future club SaaS fee on the public pitch", () => {
    const clubs = read("app/clubs/page.tsx");
    expect(clubs).toContain("Dues");
    expect(clubs).toContain("does not collect student dues or tournament entry");
    expect(clubs).not.toContain("No billing or Stripe");
    expect(read("ROADMAP.md")).not.toContain("In-app registration & payments");
    expect(read("ROADMAP.md")).toContain(
      "Student dues and in-app tournament fees stay out"
    );
  });

  it("names real processors and does not put a club subscription in force", () => {
    const privacy = read("app/privacy/page.tsx");
    expect(privacy).toContain("Vercel");
    expect(privacy).toContain("Supabase");
    expect(privacy).toContain("Resend");
    expect(privacy).toContain("Sentry");
    expect(privacy).toContain("OpenAI");
    expect(privacy).toContain("GitHub Actions");
    expect(privacy).toContain("does not claim FERPA");
    expect(privacy).toContain("does not sell an under-13 paid cohort");
    expect(privacy).not.toContain("counsel-approved");

    const terms = read("app/terms/page.tsx");
    expect(terms).toContain("not in force");
    expect(terms).toContain("Checkout is not connected");
    expect(terms).toContain("does not sell an under-13 paid cohort");
    expect(terms).not.toContain("counsel-approved");
    expect(terms).not.toContain("FERPA certified");
  });

  it("ships a skip link, one main landmark, and a legal footer nav", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('href="#main"');
    expect(layout).toContain("skip-link");
    expect(layout).toContain("sr-only");
    expect(read("app/globals.css")).toContain(".skip-link");
    expect(layout).toContain('id="main"');
    expect(layout).toContain('aria-label="Legal"');

    for (const file of [
      "app/account/page.tsx",
      "app/orgs/[slug]/reports/page.tsx",
      "app/claim/[token]/page.tsx",
      "app/me/notifications/page.tsx",
    ]) {
      expect(read(file)).not.toContain("<main");
    }
  });
});
