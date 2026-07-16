import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Causey — Find scholastic chess tournaments near you",
  description:
    "Search US scholastic chess tournaments by zip code and radius. Entry fees and section eligibility shown up front, with qualification pathways to national invitationals.",
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
