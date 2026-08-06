/**
 * Shared zip / city geo resolution for scrapers.
 * Coords come only from the Supabase `zips` table (GeoNames centroids).
 * City+state falls back to a local place→zip index (also GeoNames-derived).
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stateToCode } from "./normalize";

const GEONAMES_URL = "https://download.geonames.org/export/zip/US.zip";
const CACHE_DIR = join(process.cwd(), "data", "cache");
const CITY_ZIP_CACHE = join(CACHE_DIR, "us-city-zips.json");

export type Coords = { lat: number; lng: number };
export type GeoPrecision = "zip" | "city";

export type ResolvedLocation = {
  zip: string;
  coords: Coords;
  precision: GeoPrecision;
};

export type ZipGeo = {
  coordsForZip: (zip: string | null | undefined) => Promise<Coords | null>;
  resolveLocation: (input: {
    zip?: string | null;
    city?: string | null;
    state?: string | null;
  }) => Promise<ResolvedLocation | null>;
};

function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bst\b/g, "saint")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function placeKey(city: string, state: string): string {
  return `${normalizeCityKey(city)}|${state.toUpperCase()}`;
}

let cityZipIndex: Map<string, string> | null = null;

/** Load or rebuild city|ST → representative ZIP from GeoNames. */
export async function loadCityZipIndex(opts?: {
  forceRebuild?: boolean;
}): Promise<Map<string, string>> {
  if (cityZipIndex && !opts?.forceRebuild) return cityZipIndex;

  if (!opts?.forceRebuild && existsSync(CITY_ZIP_CACHE)) {
    const raw = JSON.parse(readFileSync(CITY_ZIP_CACHE, "utf8")) as Record<string, string>;
    cityZipIndex = new Map(Object.entries(raw));
    return cityZipIndex;
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = join(CACHE_DIR, "US.zip");
  const txtPath = join(CACHE_DIR, "US.txt");

  if (!existsSync(txtPath)) {
    if (!existsSync(zipPath)) {
      console.log(`Downloading GeoNames US postal codes for city→zip index…`);
      const res = await fetch(GEONAMES_URL);
      if (!res.ok || !res.body) {
        throw new Error(`GeoNames download failed: HTTP ${res.status}`);
      }
      await pipeline(Readable.fromWeb(res.body as never), createWriteStream(zipPath));
    }
    const txt = execFileSync("unzip", ["-p", zipPath, "US.txt"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(txtPath, txt);
  }

  const txt = readFileSync(txtPath, "utf8");
  const map = new Map<string, string>();
  for (const line of txt.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length < 11) continue;
    const zip = cols[1]?.trim();
    const place = cols[2]?.trim();
    const admin1 = cols[4]?.trim(); // state code
    if (!zip || !/^\d{5}$/.test(zip) || !place || !admin1) continue;
    const key = placeKey(place, admin1);
    if (!map.has(key)) map.set(key, zip);
  }

  writeFileSync(
    CITY_ZIP_CACHE,
    JSON.stringify(Object.fromEntries(map), null, 0) + "\n"
  );
  console.log(`City→zip index: ${map.size} places → ${CITY_ZIP_CACHE}`);
  cityZipIndex = map;
  return map;
}

export function lookupCityZip(
  index: Map<string, string>,
  city: string,
  state: string
): string | null {
  const st = stateToCode(state) ?? (/^[A-Z]{2}$/i.test(state) ? state.toUpperCase() : null);
  if (!st || !city || city === "Unknown") return null;
  return index.get(placeKey(city, st)) ?? null;
}

/**
 * Best-effort city from organizer / event title when hubs only give a state.
 * "Chicago Chess Center" + IL → Chicago; "Dallas Chess Club" → Dallas.
 */
export function guessCityFromText(
  index: Map<string, string>,
  text: string,
  state: string
): string | null {
  const st = stateToCode(state) ?? (/^[A-Z]{2}$/i.test(state) ? state.toUpperCase() : null);
  if (!st || !text) return null;

  const cleaned = text
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /\b(chess|club|academy|association|center|centre|foundation|llc|inc|scholastic|open|tournament|championships?)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  // Prefer longer multi-word matches ("New York", "San Jose").
  const words = cleaned.split(" ").filter(Boolean);
  for (let len = Math.min(words.length, 4); len >= 1; len -= 1) {
    for (let i = 0; i <= words.length - len; i += 1) {
      const candidate = words.slice(i, i + len).join(" ");
      if (candidate.length < 3) continue;
      if (lookupCityZip(index, candidate, st)) return candidate;
    }
  }
  return null;
}

export function createZipGeo(client: SupabaseClient | null): ZipGeo {
  const zipCache = new Map<string, Coords | null>();

  async function coordsForZip(zip: string | null | undefined): Promise<Coords | null> {
    if (!zip || !/^\d{5}$/.test(zip) || !client) return null;
    if (zipCache.has(zip)) return zipCache.get(zip)!;
    const { data, error } = await client
      .from("zips")
      .select("lat, lng")
      .eq("zip", zip)
      .maybeSingle();
    if (error) {
      console.warn(`zip lookup failed for ${zip}: ${error.message}`);
      zipCache.set(zip, null);
      return null;
    }
    const coords = data ? { lat: data.lat as number, lng: data.lng as number } : null;
    zipCache.set(zip, coords);
    return coords;
  }

  async function resolveLocation(input: {
    zip?: string | null;
    city?: string | null;
    state?: string | null;
  }): Promise<ResolvedLocation | null> {
    if (input.zip && /^\d{5}$/.test(input.zip)) {
      const coords = await coordsForZip(input.zip);
      if (coords) return { zip: input.zip, coords, precision: "zip" };
    }

    const state =
      (input.state && stateToCode(input.state)) ||
      (input.state && /^[A-Z]{2}$/i.test(input.state) ? input.state.toUpperCase() : null);
    const city = input.city?.trim();
    if (!state || !city || city === "Unknown") return null;

    const index = await loadCityZipIndex();
    const cityZip = lookupCityZip(index, city, state);
    if (!cityZip) return null;
    const coords = await coordsForZip(cityZip);
    if (!coords) return null;
    return { zip: cityZip, coords, precision: "city" };
  }

  return { coordsForZip, resolveLocation };
}
