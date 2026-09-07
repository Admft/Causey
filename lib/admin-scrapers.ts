import { competitionType } from "@/lib/competition-types";
import { sourceByCompetitionSource } from "@/lib/ingestion-sources";
import type { CompetitionCategory } from "@/lib/schemas";

export type AdminScraperCategory = Exclude<CompetitionCategory, "other">;

export const ADMIN_SCRAPER_OPTIONS = [
  { value: "all", label: "All currently runnable sources", category: null },
  {
    value: "tla_scrape",
    label: "US Chess upcoming tournaments",
    category: "chess",
  },
  {
    value: "cca_scrape",
    label: "Continental Chess Association",
    category: "chess",
  },
  {
    value: "onlinereg_scrape",
    label: "Online Registration",
    category: "chess",
  },
  {
    value: "chess_results_scrape",
    label: "Chess-Results",
    category: "chess",
  },
  {
    value: "fide_calendar_scrape",
    label: "FIDE calendar",
    category: "chess",
  },
  {
    value: "tca_scrape",
    label: "Texas Chess Association",
    category: "chess",
  },
  {
    value: "uil_speech_debate_scrape",
    label: "UIL speech & debate invitationals",
    category: "debate",
  },
  {
    value: "purple_comet_scrape",
    label: "Purple Comet! Math Meet",
    category: "stem",
  },
  {
    value: "doe_science_bowl_scrape",
    label: "DOE National Science Bowl",
    category: "stem",
  },
  {
    value: "txsef_scrape",
    label: "Texas Science & Engineering Fair",
    category: "stem",
  },
  {
    value: "congressional_app_challenge_scrape",
    label: "Congressional App Challenge",
    category: "stem",
  },
  {
    value: "taea_vase_scrape",
    label: "TAEA VASE visual arts",
    category: "arts",
  },
  {
    value: "uil_theatre_scrape",
    label: "UIL theatre state meets",
    category: "arts",
  },
  {
    value: "uil_music_marching_scrape",
    label: "UIL state open-class marching band",
    category: "arts",
  },
  {
    value: "bennington_writers_scrape",
    label: "Bennington Young Writers Awards",
    category: "writing",
  },
  {
    value: "afsa_essay_scrape",
    label: "AFSA National High School Essay Contest",
    category: "writing",
  },
] as const;

export type AdminScraperSource =
  (typeof ADMIN_SCRAPER_OPTIONS)[number]["value"];

export type AdminRunnableScraperSource = Exclude<AdminScraperSource, "all">;

type AdminScraperSourceOption = Exclude<
  (typeof ADMIN_SCRAPER_OPTIONS)[number],
  { value: "all" }
>;

/** Matches public discovery order: Chess → Speech & Debate → STEM → Arts → Writing. */
export const ADMIN_SCRAPER_CATEGORY_ORDER = [
  "chess",
  "debate",
  "stem",
  "arts",
  "writing",
] as const satisfies readonly AdminScraperCategory[];

export const ADMIN_RUNNABLE_SCRAPER_SOURCES = ADMIN_SCRAPER_OPTIONS.filter(
  (option): option is AdminScraperSourceOption => option.category !== null
)
  .map((option) => option.value)
  .filter(
    (source) =>
      sourceByCompetitionSource(source)?.governance.automationState ===
      "enabled"
  );

export type AdminScraperCategoryGroup = {
  id: AdminScraperCategory;
  label: string;
  options: readonly AdminScraperSourceOption[];
};

export function adminScraperCategoryGroups(): AdminScraperCategoryGroup[] {
  return ADMIN_SCRAPER_CATEGORY_ORDER.map((id) => ({
    id,
    label: competitionType(id).label,
    options: ADMIN_SCRAPER_OPTIONS.filter(
      (option): option is AdminScraperSourceOption => option.category === id
    ),
  })).filter((group) => group.options.length > 0);
}

export function isAdminScraperSource(
  value: string
): value is AdminScraperSource {
  if (value === "all") return true;
  return (
    ADMIN_SCRAPER_OPTIONS.some((option) => option.value === value) &&
    sourceByCompetitionSource(value)?.governance.automationState === "enabled"
  );
}

export function isAdminRunnableScraperSource(
  value: string
): value is AdminRunnableScraperSource {
  return ADMIN_RUNNABLE_SCRAPER_SOURCES.some((source) => source === value);
}

export function adminScraperLabel(source: string): string {
  return (
    ADMIN_SCRAPER_OPTIONS.find((option) => option.value === source)?.label ??
    source
  );
}

export function adminScraperCategoryLabel(source: string): string | null {
  const option = ADMIN_SCRAPER_OPTIONS.find(
    (entry) => entry.value === source
  );
  if (!option || option.category === null) return null;
  return competitionType(option.category).label;
}
