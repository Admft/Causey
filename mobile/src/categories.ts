/**
 * Public directories on the phone. IDs match `/api/competitions` and the
 * website nav. Chess is the densest index; the others are real and thin —
 * empty results must say that, not "coming soon."
 */
export const DISCOVERY_CATEGORIES = [
  {
    id: "chess",
    label: "Chess",
    shortLabel: "Chess",
    heading: "Find a tournament",
    description:
      "Coverage is incomplete. Confirm dates and fees on the organizer's site before you travel.",
    emptyUpcoming:
      "No upcoming chess tournaments{near} yet. Try a nearby zip, or clear it to search everywhere.",
    emptyAll: "No chess tournaments are listed right now.",
  },
  {
    id: "debate",
    label: "Debate",
    shortLabel: "Debate",
    heading: "Speech and debate",
    description:
      "Indexed listings are mostly Texas UIL invitationals with complete locations. Coverage is limited.",
    emptyUpcoming:
      "No upcoming speech or debate events{near} in Causey's index. Try Timing: All, or a nearby zip.",
    emptyAll:
      "Causey currently indexes only UIL invitationals that name speech or debate and publish a complete location.",
  },
  {
    id: "stem",
    label: "STEM",
    shortLabel: "STEM",
    heading: "STEM competitions",
    description:
      "Published coverage is a handful of official dates (Purple Comet, DOE Science Bowl nationals, Texas science fair), not a full STEM calendar.",
    emptyUpcoming:
      "No upcoming STEM listings{near} in Causey's index. Try Timing: All, or clear the zip.",
    emptyAll:
      "Published STEM coverage is currently Purple Comet, DOE National Science Bowl national dates, and the Texas state science fair.",
  },
  {
    id: "arts",
    label: "Arts",
    shortLabel: "Arts",
    heading: "Arts competitions",
    description:
      "Visual arts, music, and theatre share this list. Coverage is currently TAEA VASE plus UIL state theatre and marching band dates.",
    emptyUpcoming:
      "No upcoming arts listings{near} in Causey's index. Try Timing: All, or clear the zip.",
    emptyAll:
      "Arts coverage is currently published TAEA VASE dates plus UIL state theatre and marching band.",
  },
  {
    id: "writing",
    label: "Writing",
    shortLabel: "Writing",
    heading: "Writing competitions",
    description:
      "There are often no upcoming published writing rows. Switch Timing to All to see ended cycles Causey has indexed.",
    emptyUpcoming:
      "No upcoming writing listings{near}. Switch Timing to All to review ended cycles.",
    emptyAll:
      "Causey publishes a writing listing only when an organizer names a complete, year-specific cycle.",
  },
] as const;

export type DiscoveryCategoryId = (typeof DISCOVERY_CATEGORIES)[number]["id"];

const BY_ID = new Map(
  DISCOVERY_CATEGORIES.map((category) => [category.id, category])
);

export function isDiscoveryCategory(
  value: string | null | undefined
): value is DiscoveryCategoryId {
  return Boolean(value && BY_ID.has(value as DiscoveryCategoryId));
}

export function categoryLabel(id: string | null | undefined): string {
  if (!id) return "Tournament";
  return BY_ID.get(id as DiscoveryCategoryId)?.label ?? "Tournament";
}

export function discoveryCategory(
  id: DiscoveryCategoryId
): (typeof DISCOVERY_CATEGORIES)[number] {
  return BY_ID.get(id)!;
}
