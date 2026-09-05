import Link from "next/link";
import type { PartnerPromo } from "@/lib/partner-promos";

/**
 * Labeled partner pin. One hit target so the whole placement is the click.
 * The right rail is the §8.11 path motif with its labels on: local → state →
 * national invitationals, so the panel is filled with the actual climb instead
 * of decorative air. Copy only restates what the dek already claims.
 */
const LADDER_STEPS = [
  {
    label: "Local and weekend",
    sub: "Rated sections near your zip",
  },
  {
    label: "State championship",
    sub: "The win that can open a seat",
  },
  {
    label: "National invitationals",
    sub: "Denker · Barber · Rockefeller · Haring",
  },
] as const;

export function PartnerPromoSlot({ promo }: { promo: PartnerPromo }) {
  const headingId = `${promo.id}-heading`;
  const honestyId = `${promo.id}-honesty`;

  return (
    <Link
      href={promo.href}
      className="partner-promo group mb-5 block touch-manipulation p-5 sm:p-6"
      aria-labelledby={headingId}
      aria-describedby={honestyId}
    >
      <div className="relative z-10 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white">
            {promo.eyebrow}
          </p>
          <h2
            id={headingId}
            className="mt-2 max-w-[18ch] font-display text-display-sm font-bold tracking-tight text-white"
          >
            {promo.headline}
          </h2>
          <p className="mt-2 max-w-prose text-sm text-white">{promo.dek}</p>
          <p id={honestyId} className="mt-3 max-w-prose text-2xs text-white">
            {promo.honesty}
          </p>
          <span className="partner-promo-cta mt-4">
            {promo.ctaLabel}
            <span aria-hidden="true" className="nudge-x">
              →
            </span>
          </span>
        </div>
        <ol className="partner-promo-ladder">
          {LADDER_STEPS.map((step, index) => {
            const isGoal = index === LADDER_STEPS.length - 1;
            return (
              <li key={step.label}>
                <span
                  aria-hidden="true"
                  className={`partner-promo-ladder-dot${
                    isGoal ? " partner-promo-ladder-dot-goal" : ""
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">
                    {step.label}
                  </span>
                  <span className="mt-px block text-2xs text-white">
                    {step.sub}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Link>
  );
}
