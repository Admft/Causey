import type { Metadata } from "next";
import { CategoryDiscoveryPage } from "@/components/CategoryDiscoveryPage";

export const metadata: Metadata = {
  title: "Student writing competitions",
  description:
    "Search a limited index of official public student writing competitions. Dates are listed only when organizers publish a specific cycle.",
};

export default function WritingPage() {
  return <CategoryDiscoveryPage category="writing" />;
}
