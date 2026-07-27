/**
 * Standalone pathway enrichment pass (after scrape or on a schedule).
 *
 *   npm run enrich:pathways
 *   ENRICH_SOURCE=tla_scrape npm run enrich:pathways
 *   ENRICH_MAX_AI=40 npm run enrich:pathways
 */
import { createClient } from "@supabase/supabase-js";
import { enrichPathways } from "./enrich-pathways";
import { loadDotEnv } from "./persist";

async function main() {
  loadDotEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "No OPENAI_API_KEY — heuristics still run; AI batches need a key in .env."
    );
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const source = process.env.ENRICH_SOURCE?.trim() || undefined;
  const result = await enrichPathways(client, { source });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
