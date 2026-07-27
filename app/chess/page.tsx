import { Suspense } from "react";
import type { Metadata } from "next";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { SearchClient } from "@/components/SearchClient";
import { TournamentSources } from "@/components/TournamentSources";

export const metadata: Metadata = {
  title: "Scholastic chess competitions",
  description:
    "Search US scholastic chess tournaments by zip code and radius. Entry fees and section eligibility shown up front, with qualification pathways to national invitationals.",
};

export default function ChessSearchPage() {
  return (
    <>
      <ChessSubnavBar tool="tournaments" />
      <Suspense>
        <SearchClient />
      </Suspense>
      <TournamentSources />
    </>
  );
}
