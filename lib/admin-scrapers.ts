export const ADMIN_SCRAPER_OPTIONS = [
  { value: "all", label: "All currently runnable sources" },
  { value: "tla_scrape", label: "US Chess upcoming tournaments" },
  { value: "cca_scrape", label: "Continental Chess Association" },
  { value: "onlinereg_scrape", label: "Online Registration" },
  { value: "chess_results_scrape", label: "Chess-Results" },
  { value: "fide_calendar_scrape", label: "FIDE calendar" },
  { value: "tca_scrape", label: "Texas Chess Association" },
  { value: "vex_events_scrape", label: "VEX Events robotics" },
  { value: "taea_vase_scrape", label: "TAEA VASE visual arts" },
  {
    value: "bennington_writers_scrape",
    label: "Bennington Young Writers Awards",
  },
  {
    value: "doe_science_bowl_scrape",
    label: "DOE National Science Bowl",
  },
  {
    value: "afsa_essay_scrape",
    label: "AFSA National High School Essay Contest",
  },
  {
    value: "uil_theatre_scrape",
    label: "UIL theatre state meets",
  },
  {
    value: "uil_speech_debate_scrape",
    label: "UIL speech & debate invitationals",
  },
  {
    value: "purple_comet_scrape",
    label: "Purple Comet! Math Meet",
  },
  {
    value: "uil_music_marching_scrape",
    label: "UIL state open-class marching band",
  },
  {
    value: "txsef_scrape",
    label: "Texas Science & Engineering Fair",
  },
] as const;

export type AdminScraperSource =
  (typeof ADMIN_SCRAPER_OPTIONS)[number]["value"];

export function isAdminScraperSource(
  value: string
): value is AdminScraperSource {
  return ADMIN_SCRAPER_OPTIONS.some((option) => option.value === value);
}

export function adminScraperLabel(source: string): string {
  return (
    ADMIN_SCRAPER_OPTIONS.find((option) => option.value === source)?.label ??
    source
  );
}
