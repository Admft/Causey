import type { Metadata } from "next";
import {
  AFFILIATE_TIER_LABELS,
  STATE_AFFILIATES,
  affiliatesByTier,
  type AffiliateTier,
} from "@/lib/state-affiliates";

export const metadata: Metadata = {
  title: "USCF state affiliates",
  description:
    "US Chess Federation state affiliate websites Causey plans to index for scholastic qualifiers, state championships, and national invitational pathways.",
};

const TIERS: AffiliateTier[] = [1, 2, 3, 4];

function displayHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export default function StateAffiliatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
        Data sources · Coming soon
      </p>
      <h1 className="mt-2 max-w-[18ch] font-display text-display font-bold tracking-tight text-foreground">
        USCF state affiliates
      </h1>
      <p className="mt-4 max-w-2xl text-md text-muted">
        Causey will index calendars from every US Chess state affiliate —{" "}
        {STATE_AFFILIATES.length} organizations across all 50 states and DC.
        These sites host scholastic qualifiers and state championships that feed
        Denker, Barber, Rockefeller, Haring, and related national invitationals.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Scrapers are not live yet. Tier order is our build priority. Affiliate
        sites change often — verify a URL before relying on it.
      </p>

      <div className="mt-12 space-y-14">
        {TIERS.map((tier) => {
          const meta = AFFILIATE_TIER_LABELS[tier];
          const rows = affiliatesByTier(tier);
          return (
            <section key={tier} aria-labelledby={`tier-${tier}`}>
              <h2
                id={`tier-${tier}`}
                className="font-display text-display-sm font-bold tracking-tight text-foreground"
              >
                {meta.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{meta.blurb}</p>

              <ul className="mt-6 divide-y divide-line border-y border-line">
                {rows.map((row) => (
                  <li
                    key={`${row.region}-${row.href}`}
                    className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {row.region}
                      </p>
                      <p className="text-sm text-muted">
                        {row.org}
                        {row.abbreviation ? ` (${row.abbreviation})` : ""}
                        {row.note ? ` — ${row.note}` : ""}
                      </p>
                    </div>
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-semibold text-brand-red transition-colors hover:text-brand-red-hover"
                    >
                      {displayHost(row.href)}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
