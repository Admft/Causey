import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Scholastic chess competitions",
  description:
    "Search US scholastic chess tournaments by zip code and radius. Entry fees and section eligibility shown up front, with qualification pathways to national invitationals.",
};

export default function ChessSearchPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
        <Link
          href="/"
          className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red"
        >
          ← All competition types
        </Link>
      </div>
      <Suspense>
        <SearchClient />
      </Suspense>
    </>
  );
}
