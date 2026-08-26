import { haversineMiles } from "@/lib/geo";

export type ZipCoord = { zip: string; lat: number; lng: number };

const US_LAT_MIN = 18;
const US_LAT_MAX = 72;
const US_LNG_MIN = -180;
const US_LNG_MAX = -64;

/** Browser geolocation can fire outside the US; zip lookup only covers US rows. */
export function isPlausibleUsCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= US_LAT_MIN &&
    lat <= US_LAT_MAX &&
    lng >= US_LNG_MIN &&
    lng <= US_LNG_MAX
  );
}

export function nearestZipFromCoords(
  lat: number,
  lng: number,
  rows: readonly ZipCoord[]
): string | null {
  if (!isPlausibleUsCoordinate(lat, lng) || rows.length === 0) return null;
  let bestZip: string | null = null;
  let bestMiles = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const miles = haversineMiles(lat, lng, row.lat, row.lng);
    if (miles < bestMiles) {
      bestMiles = miles;
      bestZip = row.zip;
    }
  }
  return bestZip;
}
