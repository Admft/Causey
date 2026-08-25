import { Suspense } from "react";
import { CategorySources } from "@/components/CategorySources";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { SearchClient } from "@/components/SearchClient";
import { getSessionUser } from "@/lib/auth/session";
import type { DiscoveryCategory } from "@/lib/category-discovery";
import { isSupabaseConfigured } from "@/lib/data/portal";

export async function CategoryDiscoveryPage({
  category,
}: {
  category: Exclude<DiscoveryCategory, "chess">;
}) {
  const clubGoingAvailable =
    isSupabaseConfigured() && Boolean(await getSessionUser());
  return (
    <>
      <ChessSubnavBar category={category} />
      <Suspense>
        <SearchClient
          category={category}
          clubGoingAvailable={clubGoingAvailable}
        />
      </Suspense>
      <CategorySources category={category} />
    </>
  );
}
