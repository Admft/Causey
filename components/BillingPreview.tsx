"use client";

import { useState } from "react";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { PageBackLink } from "@/components/PageBackLink";
import { ScrollReveal } from "@/components/ScrollReveal";

type DeskStatus = "active" | "past_due" | "canceled";

const INCLUDED = [
  {
    title: "One club or team workspace",
    description:
      "Roster, groups, join links, staff and student invites, announcements.",
  },
  {
    title: "Season coordination",
    description:
      "Travel “club is going,” host draft → publish, RSVP, attendance, recorded results, season CSV.",
  },
  {
    title: "Families stay free",
    description:
      "Students and parents are not on this invoice. Search stays usable without a paid club.",
  },
];

const NOT_ON_SKU = [
  {
    title: "Student dues",
    description: "Causey does not collect club membership dues from families.",
  },
  {
    title: "Tournament entry",
    description:
      "Families still finish paid entry on the organizer’s site. RSVP is not payment.",
  },
  {
    title: "District contracts",
    description:
      "Schools and districts stay a booked conversation, not this checkout.",
  },
];

const GATED = [
  {
    title: "Roster and hosting writes",
    description:
      "Join links, staff and student invites, groups, “club is going,” host draft → publish, attendance, recorded results.",
  },
  {
    title: "Season CSV",
    description:
      "The owner’s season file would stay on the paid workspace. Export would suspend with other writes after grace.",
  },
  {
    title: "Announcements and staff",
    description:
      "Workspace notes and staff invites would follow the same gate as roster writes.",
  },
];

const STAY_FREE = [
  {
    title: "Search",
    description:
      "Chess and other directories stay usable without a paid club. No account required to browse.",
  },
  {
    title: "Student join",
    description:
      "A join link would still add a student. Causey does not collect student dues on this SKU.",
  },
  {
    title: "Family and Plan",
    description:
      "Parents and students stay off the invoice. RSVP and organizer registration are not payment.",
  },
];

const DUNNING_STEPS = [
  {
    title: "Stripe retries the card",
    description:
      "Past due would email the billing owner. No session fires on this page.",
  },
  {
    title: "Grace, length not set",
    description:
      "Roster and hosting writes would stay open until we publish a grace length. We have not set one.",
  },
  {
    title: "Suspend workspace writes",
    description:
      "Coaches would lose write access. Search, student join, Family, and Plan would not paywall.",
  },
];

const CHECKOUT_FACTS = [
  { label: "Plan", value: "Club / Team · monthly" },
  { label: "Amount", value: "Not published" },
  { label: "Workspace", value: "The club this owner is paying for" },
  { label: "Billing owner", value: "The owner’s Causey email" },
  { label: "Card", value: "Collected on Stripe Checkout, not on Causey" },
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
  rows: { label: string; value: string; hint?: string }[];
}) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map((row) => (
        <div key={row.label} className="py-3">
          <dt className="text-xs font-semibold text-muted-strong">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-bold text-foreground">{row.value}</dd>
          {row.hint ? (
            <p className="mt-0.5 text-xs text-muted">{row.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function BillingPreview({ path }: { path: string }) {
  const [desk, setDesk] = useState<DeskStatus>("active");
  const deskLabel =
    desk === "active" ? "Active" : desk === "past_due" ? "Past due" : "Canceled";
  const cycleStatus =
    desk === "canceled" ? "Void" : desk === "past_due" ? "Open" : "Paid";

  return (
    <>
      <section className="access-grid overflow-x-clip">
        <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-10">
          <div className="animate-rise">
            <PageBackLink href="/clubs">Clubs and teams</PageBackLink>
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
                A monthly club or team subscription.
              </h1>
              <p className="mt-4 max-w-prose text-md text-muted">
                The owner pays Causey for the workspace through Stripe Checkout.
                Student dues and tournament entry stay off this SKU. Districts
                are not sold here. Checkout is not connected, and no club price
                is published.
              </p>
              <div className="mt-6 flex flex-col items-start gap-2">
                <button
                  type="button"
                  disabled
                  className="cta-enabled disabled:opacity-60"
                >
                  Continue with Stripe
                </button>
                <p className="text-sm font-medium text-muted">
                  Preview only. This page 404s on Vercel.
                </p>
              </div>
            </div>

            <article
              aria-labelledby="stripe-checkout-heading"
              className="relative z-10 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                Stripe Checkout
              </p>
              <h2
                id="stripe-checkout-heading"
                className="mt-2 font-display text-display tracking-tight text-foreground"
              >
                What the owner would send to Stripe
              </h2>
              <div className="mt-4">
                <FactRows rows={CHECKOUT_FACTS} />
              </div>
              <p className="mt-4 text-xs text-muted">
                Continue would open Stripe, then return here. No session and
                no webhook fire on this page.
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
                eyebrow="On this invoice"
                title="What the club pays for"
                items={INCLUDED}
              />
              <ScopeColumn
                eyebrow="Not on this SKU"
                title="What stays off the invoice"
                items={NOT_ON_SKU}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join bg-surface">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-panel-lg)] lg:grid lg:grid-cols-2 lg:grid-rows-[auto_repeat(3,auto)]">
              <ScopeColumn
                className="max-lg:border-b max-lg:border-line lg:border-r lg:border-line"
                eyebrow="Entitlements"
                title="What a paid workspace would gate"
                items={GATED}
              />
              <ScopeColumn
                eyebrow="Stay free"
                title="What would not go on the invoice"
                items={STAY_FREE}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-band band-join band-join--soft bg-surface-soft">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal>
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)] lg:grid lg:grid-cols-2">
              <div className="border-b border-line px-5 py-5 sm:px-6 sm:py-6 lg:border-b-0 lg:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Invoices
                </p>
                <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                  Amounts stay unpublished
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  No club price is listed. Stripe would send invoices when
                  checkout is connected.
                </p>
                <div className="mt-4">
                  <FactRows
                    rows={[
                      {
                        label: "This cycle",
                        value: cycleStatus,
                        hint: "Amount not published",
                      },
                      {
                        label: "Prior cycle",
                        value: "Paid",
                        hint: "Amount not published",
                      },
                    ]}
                  />
                </div>
              </div>
              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  Dunning
                </p>
                <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                  Failed payment, then suspend writes
                </h2>
                <ol className="mt-4 divide-y divide-line border-y border-line">
                  {DUNNING_STEPS.map((step, index) => (
                    <li
                      key={step.title}
                      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3"
                    >
                      <span className="text-xs font-bold tabular-nums text-brand-red">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
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
                  Billing desk
                </p>
                <h2 className="mt-2 font-display text-display tracking-tight text-foreground">
                  After the club is subscribed
                </h2>
                <p className="mt-2 max-w-prose text-sm text-muted">
                  Owner settings would show status, invoices, and Stripe’s
                  customer portal. Switch the layout to see each state.
                </p>
                <div
                  role="group"
                  aria-label="Subscription layout"
                  className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-soft p-1"
                >
                  {(
                    [
                      ["active", "Active"],
                      ["past_due", "Past due"],
                      ["canceled", "Canceled"],
                    ] as const
                  ).map(([id, label]) => {
                    const selected = desk === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDesk(id)}
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
                {desk === "past_due" ? (
                  <div className="mt-5 border-l-2 border-brand-red pl-4">
                    <p className="text-sm font-bold text-foreground">
                      Payment failed
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Stripe would retry the card. Roster and hosting writes stay
                      open for a grace period we have not set, then suspend.
                      Students, parents, and search stay free.
                    </p>
                  </div>
                ) : null}
                {desk === "canceled" ? (
                  <div className="mt-5 border-l-2 border-line pl-4">
                    <p className="text-sm font-bold text-foreground">
                      Subscription ended
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      The workspace would become read-only for coaches. Join,
                      Family, and search would not paywall students or parents.
                    </p>
                  </div>
                ) : null}
                <div className="mt-auto flex flex-col items-start gap-2 pt-6">
                  <button
                    type="button"
                    disabled
                    className="cta-enabled disabled:opacity-60"
                  >
                    Open Stripe customer portal
                  </button>
                  <button
                    type="button"
                    disabled
                    className="text-sm font-bold text-muted"
                  >
                    Cancel subscription
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">
                  This workspace
                </p>
                <p className="mt-2 text-lead font-bold text-foreground">
                  Invoices stay unpublished
                </p>
                <div className="mt-4">
                  <FactRows
                    rows={[
                      { label: "Status", value: deskLabel },
                      { label: "Processor", value: "Stripe" },
                      { label: "Next invoice", value: "Not set" },
                      {
                        label: "This cycle",
                        value: cycleStatus,
                        hint: "Amount not published",
                      },
                      {
                        label: "Prior cycle",
                        value: "Paid",
                        hint: "Amount not published",
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
          <p className="mt-5 rounded-3xl border border-line bg-surface-soft p-5 text-sm text-muted sm:p-6">
            School districts stay a booked conversation, not this checkout.{" "}
            <Link
              href="/districts"
              className="group font-bold text-muted-strong hover:text-brand-red"
            >
              Review the district pilot{" "}
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
