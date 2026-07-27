/**
 * PostgREST encodes `.in("id", ids)` into the request URL. A full scrape
 * (~600+ UUIDs) blows past gateway URL limits → HTTP 400 Bad Request.
 * Keep filter chunks small enough for safe GETs.
 */
export const SUPABASE_IN_CHUNK = 80;

export function chunkIds<T>(ids: T[], size = SUPABASE_IN_CHUNK): T[][] {
  if (ids.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}
