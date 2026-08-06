/**
 * Collapse cross-source duplicates after upsert.
 *
 * Strategy: same fingerprint → keep highest-priority source as canonical,
 * merge sparse fields from losers into the winner, archive the rest and set
 * canonical_id. Also upsert competition_sources so every upstream URL stays
 * attached to the surviving row.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Competition } from "../lib/schemas";
import { eventFingerprint, SOURCE_PRIORITY } from "./fingerprint";

export type SourceRow = {
  competition_id: string;
  source: Competition["source"];
  external_key: string;
  source_url: string | null;
};

type CompRow = {
  id: string;
  source: string;
  fingerprint: string | null;
  status: string;
  canonical_id: string | null;
  reg_url: string | null;
  source_url: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  entry_fee_cents: number | null;
  reg_deadline: string | null;
  image_url: string | null;
  organizer_name: string | null;
  venue_name: string | null;
  details: Record<string, unknown> | null;
};

function rank(row: CompRow): number {
  const src = SOURCE_PRIORITY[row.source] ?? 0;
  const publishedBoost = row.status === "published" ? 1 : 0;
  return src * 10 + publishedBoost;
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function isBlankZip(v: unknown): boolean {
  return isBlank(v) || v === "00000";
}

/** Prefer winner values; fill gaps from losers (first non-blank wins per field). */
export function mergeCompetitionFields(
  winner: CompRow,
  losers: CompRow[]
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const keys = [
    "reg_url",
    "source_url",
    "address",
    "city",
    "entry_fee_cents",
    "reg_deadline",
    "image_url",
    "organizer_name",
    "venue_name",
  ] as const;

  for (const key of keys) {
    if (!isBlank(winner[key])) continue;
    for (const loser of losers) {
      if (!isBlank(loser[key])) {
        patch[key] = loser[key];
        break;
      }
    }
  }

  if (isBlankZip(winner.zip)) {
    for (const loser of losers) {
      if (!isBlankZip(loser.zip)) {
        patch.zip = loser.zip;
        break;
      }
    }
  }

  // Coords: only fill when winner still has placeholder / null.
  if ((winner.lat == null || winner.lat === 0) && losers.some((l) => l.lat != null && l.lat !== 0)) {
    const donor = losers.find((l) => l.lat != null && l.lat !== 0)!;
    patch.lat = donor.lat;
    patch.lng = donor.lng;
  }

  // Merge details objects (winner keys win).
  const detailMerge: Record<string, unknown> = { ...(winner.details ?? {}) };
  let detailsChanged = false;
  for (const loser of losers) {
    for (const [k, v] of Object.entries(loser.details ?? {})) {
      if (detailMerge[k] === undefined || detailMerge[k] === null) {
        detailMerge[k] = v;
        detailsChanged = true;
      }
    }
  }
  if (detailsChanged) patch.details = detailMerge;

  return patch;
}

export async function writeCompetitionSources(
  client: SupabaseClient,
  rows: SourceRow[]
): Promise<void> {
  if (rows.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((r) => ({
      ...r,
      last_seen_at: new Date().toISOString(),
    }));
    const { error } = await client.from("competition_sources").upsert(chunk as never[], {
      onConflict: "source,external_key",
    });
    if (error) {
      if (
        error.message.includes("competition_sources") ||
        error.message.includes("schema cache") ||
        error.message.includes("does not exist")
      ) {
        throw new Error(
          `${error.message}\n` +
            "Run supabase/migrations/0005_ingestion_ops.sql in the Supabase SQL editor."
        );
      }
      throw new Error(`competition_sources upsert failed: ${error.message}`);
    }
  }
}

/**
 * For each draft fingerprint, find other competitions with the same print.
 * Archive lower-priority rows and point them at the winner. Re-home any
 * competition_sources rows onto the canonical id.
 */
export async function linkFingerprintDuplicates(
  client: SupabaseClient,
  drafts: Competition[]
): Promise<number> {
  const fps = [
    ...new Set(
      drafts.map((d) =>
        eventFingerprint({
          name: d.name,
          start_date: d.start_date,
          state: d.state,
          zip: d.zip,
        })
      )
    ),
  ];
  if (fps.length === 0) return 0;

  let linked = 0;
  const BATCH = 50;
  for (let i = 0; i < fps.length; i += BATCH) {
    const chunk = fps.slice(i, i + BATCH);
    const { data, error } = await client
      .from("competitions")
      .select(
        "id, source, fingerprint, status, canonical_id, reg_url, source_url, address, city, zip, lat, lng, entry_fee_cents, reg_deadline, image_url, organizer_name, venue_name, details"
      )
      .in("fingerprint", chunk)
      .is("canonical_id", null);
    if (error) throw new Error(`dedupe lookup failed: ${error.message}`);

    const byFp = new Map<string, CompRow[]>();
    for (const row of (data ?? []) as CompRow[]) {
      const fp = row.fingerprint;
      if (!fp) continue;
      const list = byFp.get(fp) ?? [];
      list.push(row);
      byFp.set(fp, list);
    }

    for (const group of byFp.values()) {
      if (group.length < 2) continue;
      const winner = group.reduce((a, b) => (rank(b) > rank(a) ? b : a));
      const losers = group.filter((r) => r.id !== winner.id);

      const patch = mergeCompetitionFields(winner, losers);
      if (Object.keys(patch).length > 0) {
        const { error: mergeErr } = await client
          .from("competitions")
          .update(patch)
          .eq("id", winner.id);
        if (mergeErr) {
          console.warn(`dedupe field-merge failed for ${winner.id}: ${mergeErr.message}`);
        }
      }

      for (const loser of losers) {
        const { error: updErr } = await client
          .from("competitions")
          .update({
            canonical_id: winner.id,
            status: "archived",
          })
          .eq("id", loser.id)
          .is("canonical_id", null);
        if (updErr) {
          console.warn(`dedupe archive failed for ${loser.id}: ${updErr.message}`);
          continue;
        }
        await client
          .from("competition_sources")
          .update({ competition_id: winner.id })
          .eq("competition_id", loser.id);
        linked += 1;
      }
    }
  }
  return linked;
}
