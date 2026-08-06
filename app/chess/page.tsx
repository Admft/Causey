import { Suspense } from "react";
import type { Metadata } from "next";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { SearchClient } from "@/components/SearchClient";
import { TournamentSources } from "@/components/TournamentSources";

export const metadata: Metadata = {
  title: "Scholastic chess competitions",
  description:
    "Search indexed US scholastic chess tournaments by zip code and radius. Coverage is incomplete — confirm fees and eligibility on each event.",
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
