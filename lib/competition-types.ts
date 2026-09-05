import type { CompetitionCategory } from "@/lib/schemas";

export type CompetitionTypeDefinition = {
  id: CompetitionCategory;
  label: string;
  description: string;
  creationAvailable: boolean;
  discoveryAvailable: boolean;
  usesChessRatings: boolean;
  usesChessPathways: boolean;
};

export const COMPETITION_TYPES: readonly CompetitionTypeDefinition[] = [
  {
    id: "chess",
    label: "Chess",
    description: "Over-the-board and online chess tournaments.",
    creationAvailable: true,
    discoveryAvailable: true,
    usesChessRatings: true,
    usesChessPathways: true,
  },
  {
    id: "stem",
    label: "STEM",
    description: "Science, technology, engineering, and mathematics competitions.",
    creationAvailable: true,
    discoveryAvailable: true,
    usesChessRatings: false,
    usesChessPathways: false,
  },
  {
    id: "debate",
    label: "Speech & Debate",
    description: "Speech, debate, and public-speaking competitions.",
    creationAvailable: true,
    discoveryAvailable: true,
    usesChessRatings: false,
    usesChessPathways: false,
  },
  {
    id: "arts",
    label: "Arts",
    description: "Visual, performing, and creative arts competitions.",
    creationAvailable: true,
    discoveryAvailable: true,
    usesChessRatings: false,
    usesChessPathways: false,
  },
  {
    id: "writing",
    label: "Writing",
    description: "Essay, journalism, poetry, and creative-writing competitions.",
    creationAvailable: true,
    discoveryAvailable: true,
    usesChessRatings: false,
    usesChessPathways: false,
  },
  {
    id: "other",
    label: "Other",
    description: "A scheduled competition not covered by the listed types.",
    creationAvailable: true,
    discoveryAvailable: false,
    usesChessRatings: false,
    usesChessPathways: false,
  },
] as const;

const BY_ID = new Map(COMPETITION_TYPES.map((type) => [type.id, type]));

export function competitionType(
  category: CompetitionCategory
): CompetitionTypeDefinition {
  return BY_ID.get(category) ?? COMPETITION_TYPES[0];
}

export function competitionTypeLabel(input: {
  category: CompetitionCategory | "";
  customCategoryName?: string | null;
}): string {
  if (!input.category) return "Type not chosen";
  if (input.category === "other" && input.customCategoryName?.trim()) {
    return input.customCategoryName.trim();
  }
  return competitionType(input.category).label;
}

export const CREATABLE_COMPETITION_TYPES = COMPETITION_TYPES.filter(
  (type) => type.creationAvailable
);
