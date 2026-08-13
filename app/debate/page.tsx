import type { Metadata } from "next";
import { CategoryDiscoveryPage } from "@/components/CategoryDiscoveryPage";

export const metadata: Metadata = {
  title: "Speech and debate tournaments",
  description:
    "Search a limited index of official public speech and debate tournament listings. Coverage may be incomplete.",
};

export default function DebatePage() {
  return <CategoryDiscoveryPage category="debate" />;
}
