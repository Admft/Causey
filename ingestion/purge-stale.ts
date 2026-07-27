/**
 * Delete competitions that ended more than one year ago.
 *
 * End date = end_date ?? start_date. Sections cascade; qualification rules
 * that point at a purged competition are removed; canonical_id self-refs
 * pointing at purged rows are cleared first.
 *
 *   npm run purge:stale
 *   PURGE_DRY_RUN=1 npm run purge:stale
 */
import { pathToFileURL } from "node:url";
import { getServiceRoleClient } from "../lib/supabase/client";
import {
  isPastRetention,
  retentionCutoffDate,
  todayIsoDate,
} from "../lib/competition-timing";

const PAGE = 500;

async function main() {
  const client = getServiceRoleClient();
  if (!client) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const asOf = todayIsoDate();
  const cutoff = retentionCutoffDate(asOf);
  const dryRun = process.env.PURGE_DRY_RUN === "1" || process.env.PURGE_DRY_RUN === "true";

  console.log(
    `Purge stale competitions (ended before ${cutoff}; asOf ${asOf})${dryRun ? " [dry-run]" : ""}`
  );

  // Fetch candidates cheaply: start_date before cutoff covers most; still
  // verify with effective end (end_date ?? start_date) in JS.
  const staleIds: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("competitions")
      .select("id, start_date, end_date")
      .lt("start_date", cutoff)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`List failed: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) {
      if (
        isPastRetention({
          start_date: row.start_date as string,
          end_date: (row.end_date as string | null) ?? null,
        }, asOf)
      ) {
        staleIds.push(row.id as string);
      }
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  // Also catch rows where start_date is recent but end_date is old (unlikely).
  const { data: endDated, error: endErr } = await client
    .from("competitions")
    .select("id, start_date, end_date")
    .not("end_date", "is", null)
    .lt("end_date", cutoff)
    .gte("start_date", cutoff);
  if (endErr) throw new Error(`End-date list failed: ${endErr.message}`);
  for (const row of endDated ?? []) {
    const id = row.id as string;
    if (!staleIds.includes(id)) staleIds.push(id);
  }

  console.log(`Found ${staleIds.length} competition(s) past retention.`);
  if (staleIds.length === 0) return;
  if (dryRun) {
    console.log("Dry run — no deletes.");
    return;
  }

  // Clear self-refs so delete isn't blocked by canonical_id FK.
  const { error: canonErr } = await client
    .from("competitions")
    .update({ canonical_id: null })
    .in("canonical_id", staleIds);
  if (canonErr) throw new Error(`Clear canonical_id failed: ${canonErr.message}`);

  const { error: rulesErr } = await client
    .from("qualification_rules")
    .delete()
    .in("from_competition_id", staleIds);
  if (rulesErr) throw new Error(`Delete qualification_rules failed: ${rulesErr.message}`);

  // Delete in chunks.
  let deleted = 0;
  for (let i = 0; i < staleIds.length; i += PAGE) {
    const chunk = staleIds.slice(i, i + PAGE);
    const { error: delErr, count } = await client
      .from("competitions")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (delErr) throw new Error(`Delete competitions failed: ${delErr.message}`);
    deleted += count ?? chunk.length;
  }

  console.log(`Deleted ${deleted} competition(s).`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
