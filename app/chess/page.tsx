import { Suspense } from "react";
import type { Metadata } from "next";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { SearchClient } from "@/components/SearchClient";
import { TournamentSources } from "@/components/TournamentSources";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/data/portal";

export const metadata: Metadata = {
  title: "Scholastic chess competitions",
  description:
    "Search indexed US scholastic chess tournaments by zip code and radius. Coverage is incomplete — confirm fees and eligibility on each event.",
};

export default async function ChessSearchPage() {
  const clubGoingAvailable =
    isSupabaseConfigured() && Boolean(await getSessionUser());
  return (
    <>
      <ChessSubnavBar tool="tournaments" />
      <Suspense>
        <SearchClient
          category="chess"
          clubGoingAvailable={clubGoingAvailable}
        />
      </Suspense>
      <TournamentSources />
    </>
  );
}
