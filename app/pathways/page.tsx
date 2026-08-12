import type { Metadata } from "next";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { PathwayExplorer } from "@/components/PathwayExplorer";

export const metadata: Metadata = {
  title: "Qualification pathways (illustrative)",
  description:
    "Illustrative lookup of how scholastic chess results can chain into invitations. Rules are seeded scaffolding pending verification against official US Chess sources.",
};

export default function PathwaysPage() {
  return (
    <>
      <ChessSubnavBar tool="pathways" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          Illustrative lookup
        </p>
        <h1 className="mt-2 max-w-[20ch] font-display text-display-lg font-bold tracking-tight text-foreground">
          What might a result unlock?
        </h1>
        <p className="mt-3 max-w-prose text-md text-muted">
          In chess, a handful of national invitationals are earned, not entered.
          This page walks illustrative qualification chains from seeded rules —
          not an official US Chess ruling. Confirm every invitation with the
          published announcement before you plan travel or fees.
        </p>
        <p
          className="mt-4 max-w-prose border-l-2 border-line pl-4 text-sm text-muted-strong"
          role="note"
        >
          Rules shown are scaffolding pending verification. Each result carries
          its source note and review date when available.
        </p>
        <div className="section-rule mt-8 pt-8">
          <PathwayExplorer />
        </div>
      </div>
    </>
  );
}
