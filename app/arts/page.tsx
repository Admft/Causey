import type { Metadata } from "next";
import { CategoryDiscoveryPage } from "@/components/CategoryDiscoveryPage";

export const metadata: Metadata = {
  title: "Student arts competitions",
  description:
    "Search a limited index of official public student arts competition listings. Current coverage may be incomplete.",
};

export default function ArtsPage() {
  return <CategoryDiscoveryPage category="arts" />;
}
