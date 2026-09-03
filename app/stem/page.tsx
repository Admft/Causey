import type { Metadata } from "next";
import { CategoryDiscoveryPage } from "@/components/CategoryDiscoveryPage";

export const metadata: Metadata = {
  title: "Student STEM competitions",
  description:
    "Search a limited index of official public STEM competition listings. Current coverage starts with Purple Comet mathematics, DOE National Science Bowl national dates, and the Texas state science fair, and may be incomplete.",
};

export default function StemPage() {
  return <CategoryDiscoveryPage category="stem" />;
}
