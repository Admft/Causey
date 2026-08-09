export const ADMIN_SCRAPER_OPTIONS = [
  { value: "all", label: "All tournament sources" },
  { value: "tla_scrape", label: "US Chess upcoming tournaments" },
  { value: "cca_scrape", label: "Continental Chess Association" },
  { value: "onlinereg_scrape", label: "Online Registration" },
  { value: "chess_results_scrape", label: "Chess-Results" },
  { value: "fide_calendar_scrape", label: "FIDE calendar" },
  { value: "tca_scrape", label: "Texas Chess Association" },
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
