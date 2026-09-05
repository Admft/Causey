import type { Metadata } from "next";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { PageBackLink } from "@/components/PageBackLink";
import { PathwayExplorer } from "@/components/PathwayExplorer";
import { partnerPromoForCategory } from "@/lib/partner-promos";

const chessNationalsPromo = partnerPromoForCategory("chess");

if (!chessNationalsPromo) {
  throw new Error("Chess nationals promo is required for /pathways.");
}

const chessNationals = chessNationalsPromo;

export const metadata: Metadata = {
  title: "Chess qualification pathways (illustrative)",
  description:
    "Illustrative lookup of how scholastic chess results can chain into national invitationals. Rules are seeded scaffolding pending verification against official US Chess sources.",
};

export default function PathwaysPage() {
  return (
    <>
      <ChessSubnavBar tool="pathways" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <PageBackLink href="/chess">Chess tournaments</PageBackLink>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-red">
          Illustrative lookup
        </p>
        <h1 className="mt-2 max-w-[20ch] font-display text-display-lg font-bold tracking-tight text-foreground">
          {chessNationals.headline}
        </h1>
        <p className="mt-3 max-w-prose text-md text-muted">
          {chessNationals.dek} Pick a result to see what it might unlock. This
          is not an official US Chess ruling.
        </p>
        <p
          className="mt-4 max-w-prose border-l-2 border-line pl-4 text-sm text-muted-strong"
          role="note"
        >
          Rules shown are seeded scaffolding pending verification. Each result
          carries its source note and review date when available. Confirm every
          invitation with the published announcement before you plan travel or
          fees.
        </p>
        <div className="section-rule mt-8 pt-8">
          <PathwayExplorer />
        </div>
      </div>
    </>
  );
}
