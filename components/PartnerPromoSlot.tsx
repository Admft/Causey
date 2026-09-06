import Link from "next/link";
import {
  CHESS_PATHWAY_STEPS,
  type PartnerPromo,
  type PartnerPromoLayout,
} from "@/lib/partner-promos";

/**
 * Labeled pathways pin. Home is a split card: red promise, white path.
 * Chess search stays a compact ticket. One hit target.
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
      className={
        featured
          ? "partner-promo partner-promo--featured card-lift group mb-5 block touch-manipulation"
          : "partner-promo partner-promo--search group mb-5 block touch-manipulation"
      }
      aria-labelledby={headingId}
      aria-describedby={honestyId}
    >
      {featured ? (
        <FeaturedSplit
          promo={promo}
          headingId={headingId}
          honestyId={honestyId}
        />
      ) : (
        <SearchTicket
          promo={promo}
          headingId={headingId}
          honestyId={honestyId}
        />
      )}
    </Link>
  );
}

function FeaturedSplit({
  promo,
  headingId,
  honestyId,
}: {
  promo: PartnerPromo;
  headingId: string;
  honestyId: string;
}) {
  return (
    <>
      <div className="partner-promo-face">
        <div className="partner-promo-copy">
          <p className="partner-promo-kicker">{promo.eyebrow}</p>
          <h2
            id={headingId}
            className="partner-promo-headline font-display text-display-sm tracking-tight text-white md:text-display"
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
    </>
  );
}

function SearchTicket({
  promo,
  headingId,
  honestyId,
}: {
  promo: PartnerPromo;
  headingId: string;
  honestyId: string;
}) {
  return (
    <>
      <div className="partner-promo-copy">
        <h2
          id={headingId}
          className="partner-promo-headline font-display text-xl font-bold tracking-tight text-white"
        >
          {promo.headline}
        </h2>
      </div>
      <div className="partner-promo-foot">
        <div className="partner-promo-bar">
          <ol
            className="partner-promo-climb"
            aria-label="Local, then state, then nationals"
          >
            {CHESS_PATHWAY_STEPS.map((step, index) => (
              <li key={step.id}>
                {index > 0 ? (
                  <span aria-hidden="true" className="partner-promo-climb-mark">
                    →
                  </span>
                ) : null}
                {step.name}
              </li>
            ))}
          </ol>
          <span className="partner-promo-cta">
            {promo.ctaLabel}
            <span aria-hidden="true" className="nudge-x">
              →
            </span>
          </span>
        </div>
        <p id={honestyId} className="partner-promo-note">
          {promo.honesty}
        </p>
      </div>
    </>
  );
}
