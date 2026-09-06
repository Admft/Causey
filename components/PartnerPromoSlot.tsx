import Link from "next/link";
import {
  CHESS_PATHWAY_STEPS,
  type PartnerPromo,
  type PartnerPromoLayout,
} from "@/lib/partner-promos";

/**
 * Labeled pathways pin. Home keeps the split card (red promise, white
 * path). Chess search is the red face only — no path visual.
 */
export function PartnerPromoSlot({
  promo,
  layout,
}: {
  promo: PartnerPromo;
  layout: PartnerPromoLayout;
}) {
  const headingId = `${promo.id}-${layout}-heading`;
  const honestyId = `${promo.id}-${layout}-honesty`;
  const featured = layout === "featured";

  return (
    <Link
      href={promo.href}
      className={`partner-promo partner-promo--${layout} card-lift group mb-5 block touch-manipulation`}
      aria-labelledby={headingId}
      aria-describedby={honestyId}
    >
      <div className="partner-promo-face">
        <div className="partner-promo-copy">
          <p className="partner-promo-kicker">{promo.eyebrow}</p>
          <h2
            id={headingId}
            className={
              featured
                ? "partner-promo-headline font-display text-display-sm tracking-tight text-white md:text-display"
                : "partner-promo-headline font-display text-display-sm tracking-tight text-white"
            }
          >
            {promo.headline}
          </h2>
        </div>
        <div className="partner-promo-face-action">
          <span className="partner-promo-cta">
            {promo.ctaLabel}
            <span aria-hidden="true" className="nudge-x">
              →
            </span>
          </span>
        </div>
      </div>
      {featured ? (
        <div className="partner-promo-path">
          <ol
            className="partner-promo-path-list"
            aria-label="Local, then state, then nationals"
          >
            {CHESS_PATHWAY_STEPS.map((step) => (
              <li key={step.id} className="partner-promo-path-step">
                <span className="partner-promo-path-node" aria-hidden="true" />
                <span className="partner-promo-path-mark">{step.mark}</span>
                <span className="partner-promo-path-name">{step.name}</span>
                <span className="partner-promo-path-copy">{step.line}</span>
              </li>
            ))}
          </ol>
          <p id={honestyId} className="partner-promo-note partner-promo-note--path">
            {promo.honesty}
          </p>
        </div>
      ) : (
        <p id={honestyId} className="sr-only">
          {promo.honesty}
        </p>
      )}
    </Link>
  );
}
