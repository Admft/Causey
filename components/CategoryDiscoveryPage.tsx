import { Suspense } from "react";
import { CategorySources } from "@/components/CategorySources";
import { ChessSubnavBar } from "@/components/ChessSubnav";
import { SearchClient } from "@/components/SearchClient";
import type { DiscoveryCategory } from "@/lib/category-discovery";

export function CategoryDiscoveryPage({
  category,
}: {
  category: Exclude<DiscoveryCategory, "chess">;
}) {
  return (
    <>
      <ChessSubnavBar category={category} />
      <Suspense>
        <SearchClient category={category} />
      </Suspense>
      <CategorySources category={category} />
    </>
  );
}
