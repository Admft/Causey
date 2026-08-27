/**
 * Copy expired Google Sites / Facebook listing covers into tournament-covers.
 *
 * Signed `lh3.googleusercontent.com/sitesv` tokens 403 after a while, so search
 * cards show an empty box. This re-fetches a live photo from the organizer
 * page and stores it on our bucket.
 *
 *   npx tsx ingestion/refresh-ephemeral-covers.ts
 */
import { pathToFileURL } from "node:url";
import { isEphemeralCoverUrl, isHostedCoverUrl } from "../lib/cover-url";
import { getServiceRoleClient } from "../lib/supabase/client";
import { enrichCoverFromOrganizerSite } from "./enrich-organizer-cover";
import { extractPageImage } from "./extract-page-image";
import { fetchHtml, fetchPublicHtml } from "./fetch-html";
import { parseDetailHtml } from "./parse-uschess";
import { loadDotEnv } from "./persist";
import { mapLimit, rehostScrapedCover } from "./rehost-cover";

loadDotEnv();

type CoverRow = {
  id: string;
  slug: string;
  name: string;
  source: string;
  source_url: string | null;
  reg_url: string | null;
  image_url: string | null;
  start_date: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadEphemeralRows(
  client: NonNullable<ReturnType<typeof getServiceRoleClient>>
): Promise<CoverRow[]> {
  const rows: CoverRow[] = [];
  const pageSize = 200;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("competitions")
      .select("id, slug, name, source, source_url, reg_url, image_url, start_date")
      .or(
        "image_url.ilike.%googleusercontent.com%,image_url.ilike.%fbcdn.net%,image_url.ilike.%ggpht.com%"
      )
      .is("canonical_id", null)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as CoverRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows.filter((row) => isEphemeralCoverUrl(row.image_url));
}

async function extractFreshCover(row: CoverRow): Promise<string | null> {
  if (row.source === "tla_scrape" && row.source_url) {
    try {
      const html = await fetchHtml(row.source_url);
      const detail = parseDetailHtml(html, row.source_url);
      // US Chess pages only carry chrome; force the organizer-site lookup.
      detail.imageUrl = null;
      await enrichCoverFromOrganizerSite(detail, row.name, row.start_date);
      if (detail.imageUrl) return detail.imageUrl;
    } catch (err) {
      console.warn(`  US Chess refresh failed for ${row.slug}:`, err);
    }
  }

  const pages = [row.reg_url, row.source_url].filter(
    (url): url is string =>
      typeof url === "string" && !/uschess\.org/i.test(url)
  );
  for (const pageUrl of [...new Set(pages)]) {
    try {
      const html = await fetchPublicHtml(pageUrl);
      const imageUrl = extractPageImage(html, pageUrl);
      if (imageUrl) return imageUrl;
    } catch {
      continue;
    }
  }
  return null;
}

async function refreshRow(
  client: NonNullable<ReturnType<typeof getServiceRoleClient>>,
  row: CoverRow
): Promise<"hosted" | "cleared" | "unchanged"> {
  const fromCurrent = row.image_url
    ? await rehostScrapedCover(client, row.image_url, row.source, row.id)
    : null;
  const fromFresh =
    fromCurrent ??
    (await (async () => {
      const fresh = await extractFreshCover(row);
      if (!fresh) return null;
      return rehostScrapedCover(client, fresh, row.source, row.id);
    })());

  const nextUrl = fromFresh;
  if (nextUrl && nextUrl !== row.image_url) {
    const { error } = await client
      .from("competitions")
      .update({ image_url: nextUrl })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return "hosted";
  }
  if (!nextUrl && row.image_url && !isHostedCoverUrl(row.image_url)) {
    const { error } = await client
      .from("competitions")
      .update({ image_url: null })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return "cleared";
  }
  return "unchanged";
}

async function main() {
  const client = getServiceRoleClient();
  if (!client) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const rows = await loadEphemeralRows(client);
  console.log(`Ephemeral covers to refresh: ${rows.length}`);
  let hosted = 0;
  let cleared = 0;
  const results = await mapLimit(rows, 2, async (row, index) => {
    process.stdout.write(
      `\r${index + 1}/${rows.length} ${row.name.slice(0, 48).padEnd(48)}`
    );
    const result = await refreshRow(client, row);
    await sleep(200);
    return result;
  });
  process.stdout.write("\n");
  for (const result of results) {
    if (result === "hosted") hosted += 1;
    if (result === "cleared") cleared += 1;
  }
  console.log(`Copied to storage: ${hosted}. Dropped dead URLs: ${cleared}.`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
