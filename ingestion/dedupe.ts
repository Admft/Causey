/**
 * Collapse cross-source duplicates after upsert.
 *
 * Strategy: same fingerprint → keep highest-priority source as canonical,
 * archive the rest and set canonical_id. Also upsert competition_sources so
 * every upstream URL stays attached to the surviving row.
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
};

function rank(row: CompRow): number {
  const src = SOURCE_PRIORITY[row.source] ?? 0;
  const publishedBoost = row.status === "published" ? 1 : 0;
  return src * 10 + publishedBoost;
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
      .select("id, source, fingerprint, status, canonical_id")
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

      for (const loser of group) {
        if (loser.id === winner.id) continue;
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
