import type { Metadata } from "next";
import { PathwayExplorer } from "@/components/PathwayExplorer";

export const metadata: Metadata = {
  title: "Qualification pathways",
  description:
    "Trace how scholastic chess results chain into invitations: win a state championship, get invited to the Denker, Barber, Rockefeller, or Haring national invitationals.",
};

export default function PathwaysPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="max-w-[20ch] font-display text-display-lg font-bold tracking-tight text-foreground">
        What does a result actually get you?
      </h1>
      <p className="mt-3 max-w-prose text-md text-muted">
        In chess, a handful of national invitationals are earned, not entered:
        win your state high school championship and you&rsquo;re invited to the
        Denker at the U.S. Open. Those chains are published nowhere in one
        place — this page walks them for any event, placement by placement.
      </p>
      <div className="section-rule mt-8 pt-8">
        <PathwayExplorer />
      </div>
    </div>
  );
}
