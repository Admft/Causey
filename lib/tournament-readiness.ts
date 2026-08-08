/**
 * When a scraped/admin tournament can appear in zip search.
 * Matches scraper "ready" gates: real zip + resolved coords + usable place.
 */

const NEEDS_REVIEW_ZIP = "00000";

export type TournamentReadinessInput = {
  name: string;
  start_date: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  reg_url: string | null;
};

export function isLocationPublishReady(row: {
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}): boolean {
  if (!/^\d{5}$/.test(row.zip) || row.zip === NEEDS_REVIEW_ZIP) return false;
  if (row.lat === 0 && row.lng === 0) return false;
  if (!row.state || row.state.length !== 2 || row.state.toUpperCase() === "XX") {
    return false;
  }
  const city = row.city?.trim() ?? "";
  if (!city || city.toLowerCase() === "unknown") return false;
  return true;
}

/** Core fields filled so an admin can publish without fixing location/basics first. */
export function isTournamentPublishReady(
  row: TournamentReadinessInput
): boolean {
  if (!row.name?.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) return false;
  if (!row.reg_url) return false;
  return isLocationPublishReady(row);
}
