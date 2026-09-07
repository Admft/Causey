/** Official Office of Science pages used by the DOE National Science Bowl adapter. */

export const DOE_SCIENCE_BOWL_REGIONAL_URL =
  "https://science.osti.gov/wdts/nsb/Regional-Competitions";

export function isDoeScienceBowlSource(
  source: string | null | undefined
): boolean {
  return source === "doe_science_bowl_scrape";
}
