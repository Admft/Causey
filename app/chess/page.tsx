import { Suspense } from "react";
import type { Metadata } from "next";
import { CategorySwitcher } from "@/components/CategorySwitcher";
import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Scholastic chess competitions",
  description:
    "Search US scholastic chess tournaments by zip code and radius. Entry fees and section eligibility shown up front, with qualification pathways to national invitationals.",
};

export default function ChessSearchPage() {
  return (
    <>
      {/* Category chrome lives under the sticky header — not in the hero.
          Keeps the headline first and treats type-switching as navigation. */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-2.5 sm:px-8">
          <CategorySwitcher active="chess" />
        </div>
      </div>
      <Suspense>
        <SearchClient />
      </Suspense>
    </>
  );
}
