import Link from "next/link";
import type { PartnerPromo } from "@/lib/partner-promos";

/**
 * Labeled partner pin. One hit target so the whole placement is the click.
 */
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
      <p className="relative z-10 text-xs font-semibold uppercase tracking-wide text-white">
        {promo.eyebrow}
      </p>
      <h2
        id={headingId}
        className="relative z-10 mt-2 max-w-[18ch] font-display text-display-sm font-bold tracking-tight text-white"
      >
        {promo.headline}
      </h2>
      <p className="relative z-10 mt-2 max-w-prose text-sm text-white">{promo.dek}</p>
      <p
        id={honestyId}
        className="relative z-10 mt-3 max-w-prose text-2xs text-white"
      >
        {promo.honesty}
      </p>
      <span className="partner-promo-cta relative z-10 mt-4">
        {promo.ctaLabel}
        <span aria-hidden="true" className="nudge-x">
          →
        </span>
      </span>
    </Link>
  );
}
