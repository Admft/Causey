"use client";

import { useState } from "react";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FOUNDING_TEAM_MEETING_URL } from "@/lib/founding-team";

type HostLayout = "shared" | "custom";

const ISOLATION_FACTS = [
  { label: "Tenant key", value: "District UUID, never the slug" },
  { label: "Unknown host", value: "Fail closed — no default tenant" },
  { label: "Custom host omits", value: "/admin, /clubs, and other districts" },
  { label: "Feature flags", value: "Allowlist on that UUID, not if (slug === …)" },
  { label: "Cookie", value: "Host-only on a vanity host" },
];

const ON_PORTAL = [
  {
    title: "This district’s schools",
    description:
      "The portal would list only schools connected to the bound district UUID.",
  },
  {
    title: "School and district tournaments",
    description:
      "The calendar would be that district’s hosted and school-hosted events, not a mixed club list.",
  },
  {
    title: "Aggregate reports",
    description:
      "District office totals stay counts by school. Named student browsing stays off the central office.",
  },
];

const STAY_ON_CAUSEY = [
  {
    title: "Public chess search",
    description:
      "The public index stays on causey.dev. A custom host does not become a second chess directory.",
  },
  {
    title: "January shared workspace",
    description:
      "The written January pilot is the shared /orgs shell. This page is an unsold later SKU.",
  },
  {
    title: "Platform admin",
    description:
      "Causey ops stay on the Causey host. A vanity host must not mount /admin.",
  },
];

function ScopeColumn({
  eyebrow,
  title,
  items,
  className = "",
}: {
  eyebrow: string;
  title: string;
  items: { title: string; description: string }[];
  className?: string;
}) {
  return (
    <div
      className={`grid min-w-0 lg:row-span-4 lg:grid-rows-subgrid ${className}`}
    >
      <header className="px-6 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
          {title}
        </h2>
      </header>
      {items.map((item) => (
        <div
          key={item.title}
          className="border-t border-line px-6 py-5 last:pb-6 sm:px-8 sm:py-6 sm:last:pb-8"
        >
          <p className="text-lead font-bold text-foreground">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function FactRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map((row) => (
        <div key={row.label} className="py-3">
          <dt className="text-xs font-semibold text-muted-strong">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-bold text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PortalPreview({ path }: { path: string }) {
  const [host, setHost] = useState<HostLayout>("shared");

  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-10">
          <div className="animate-rise">
            <PageBackLink href="/districts">Schools and districts</PageBackLink>
          </div>
          <div className="mt-5 grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="relative z-10 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div data-hero-brand>
                <CauseyLogo size="hero" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Local preview · {path}
              </p>
              <h1 className="mt-3 max-w-[16ch] font-display text-display md:text-display-lg tracking-tight text-foreground">
                A custom school-district host, later.
              </h1>
              <p className="mt-4 max-w-prose text-md text-muted">
                January pilots use the shared organization workspace on
                Causey — not a custom portal. A vanity host would bind one
                district UUID and fail closed on anything else. This SKU is
                not sold, and no partner district is named here.
              </p>
              <div className="mt-6 flex flex-col items-start gap-2">
                <a
                  href={FOUNDING_TEAM_MEETING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Book a district pilot conversation with Causey in a new tab"
                  className="cta-enabled inline-flex"
                >
                  Book a district pilot conversation{" "}
                  <span aria-hidden="true" className="ml-2 nudge-x">
                    ↗
                  </span>
                </a>
                <p className="text-sm font-medium text-muted">
                  Preview only. This page 404s on Vercel.
                </p>
              </div>
            </div>

            <article
              aria-labelledby="portal-isolation-heading"
              className="relative z-10 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Isolation contract
              </p>
              <h2
                id="portal-isolation-heading"
                className="mt-2 font-display text-display tracking-tight text-foreground"
              >
                What a custom host would have to bind
              </h2>
              <div className="mt-4">
                <FactRows rows={ISOLATION_FACTS} />
              </div>
              <p className="mt-4 text-xs text-muted">
                Host routing is not connected. No cookie and no feature flag
                fire on this page.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)] lg:grid lg:grid-cols-2 lg:grid-rows-[auto_repeat(3,auto)]">
              <ScopeColumn
                className="max-lg:border-b max-lg:border-line lg:border-r lg:border-line"
                eyebrow="On a custom host"
                title="What that district would see"
                items={ON_PORTAL}
              />
              <ScopeColumn
                eyebrow="Stay on Causey"
                title="What would not move to a vanity host"
                items={STAY_ON_CAUSEY}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)] lg:grid lg:grid-cols-2">
              <div className="flex flex-col border-b border-line px-5 py-5 sm:px-6 sm:py-6 lg:border-b-0 lg:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Host layout
                </p>
                <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                  Shared Causey or a vanity host
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  Switch the layout. A custom host would use a host-only
                  cookie. The shared app would keep a district switcher.
                </p>
                <div
                  role="group"
                  aria-label="Host layout"
                  className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-soft p-1"
                >
                  {(
                    [
                      ["shared", "Shared host"],
                      ["custom", "Custom host"],
                    ] as const
                  ).map(([id, label]) => {
                    const selected = host === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setHost(id)}
                        className={
                          selected
                            ? "rounded-lg bg-white px-2 py-2 text-center text-sm font-semibold text-brand-red shadow-[var(--shadow-card)]"
                            : "rounded-lg px-2 py-2 text-center text-sm font-medium text-muted-strong hover:text-foreground"
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {host === "shared" ? (
                  <div className="mt-5 border-l-2 border-line pl-4">
                    <p className="text-sm font-bold text-foreground">
                      causey.dev
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Staff who also coach a club would switch districts
                      explicitly. Clubs stay on Causey. January pilots use
                      this shared /orgs workspace.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 border-l-2 border-brand-red pl-4">
                    <p className="text-sm font-bold text-foreground">
                      Unknown host fails closed
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      The Host header would resolve one district UUID. It
                      would not serve /admin, /clubs, or another district’s
                      /orgs path. DNS and certificates are not configured.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  This request
                </p>
                <p className="mt-2 text-lead font-bold text-foreground">
                  {host === "shared"
                    ? "Shared Causey chrome"
                    : "Vanity host, not connected"}
                </p>
                <div className="mt-4">
                  <FactRows
                    rows={
                      host === "shared"
                        ? [
                            { label: "Host", value: "causey.dev" },
                            { label: "Tenant", value: "Chosen in the workspace" },
                            { label: "Cookie", value: "Causey session" },
                            {
                              label: "Clubs",
                              value: "Visible on Causey, not in this district",
                            },
                          ]
                        : [
                            { label: "Host", value: "Not bound" },
                            { label: "Tenant", value: "District UUID" },
                            { label: "Cookie", value: "Host-only, not set" },
                            {
                              label: "Clubs",
                              value: "Not mounted on this host",
                            },
                          ]
                    }
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
          <p className="mt-5 rounded-3xl border border-line bg-surface-soft p-5 text-sm text-muted sm:p-6">
            Clubs and teams pay on a different SKU, when checkout is
            connected.{" "}
            <Link
              href="/clubs"
              className="group font-bold text-muted-strong hover:text-brand-red"
            >
              Review clubs and teams{" "}
              <span aria-hidden="true" className="nudge-x">
                →
              </span>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
