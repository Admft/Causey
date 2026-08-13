import type { Metadata } from "next";
import { CategoryDiscoveryPage } from "@/components/CategoryDiscoveryPage";

export const metadata: Metadata = {
  title: "Student STEM competitions",
  description:
    "Search a limited index of official public STEM competition listings. Current coverage starts with VEX robotics and may be incomplete.",
};

export default function StemPage() {
  return <CategoryDiscoveryPage category="stem" />;
}
