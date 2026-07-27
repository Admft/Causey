/**
 * Pathway enrichment with OpenAI (gpt-4.1-mini by default) via the AI SDK.
 *
 * Cost controls:
 * 1. Heuristic triage (pathway-triage.ts) — majority skip the model.
 * 2. input_hash cache — unchanged events are not re-billed.
 * 3. Batched structured calls (default 20 events / request).
 * 4. Compact fields only (no HTML). Model: gpt-4.1-mini
 *
 * Never writes qualification_rules. May set series_id only when the model
 * returns a known series id with status=known.
 *
 * Auth: OPENAI_API_KEY in .env (project root). Set ENRICH_PATHWAYS=0 to skip.
 * ENRICH_MAX_AI caps model-bound events per run.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  pathwayInputHash,
  PROMPT_VERSION,
  triagePathway,
} from "./pathway-triage";
import { chunkIds } from "./chunk-ids";
import { SERIES_MATCH_RULES } from "./series-match";

/** Cheap OpenAI model for classification. Override with ENRICH_MODEL. */
const DEFAULT_MODEL = "gpt-4.1-mini";
const BATCH_SIZE = Number(process.env.ENRICH_BATCH_SIZE ?? 20);
const MAX_AI = Number(process.env.ENRICH_MAX_AI ?? 80);

const SeriesCatalog = SERIES_MATCH_RULES.map((r) => ({
  id: r.seriesId,
  label: r.label,
}));

const ItemOut = z.object({
  id: z.string().uuid().describe("Competition id from the input list"),
  status: z
    .enum(["none", "uncertain", "known"])
    .describe(
      "none=no pathway; uncertain=possible but unconfirmed; known=clear path or series"
    ),
  summary: z
    .string()
    .max(280)
    .describe("One or two short sentences for the event page"),
  related: z
    .array(
      z.object({
        name: z.string(),
        note: z
          .string()
          .nullable()
          .describe("Optional short note; null when none"),
      })
    )
    .max(5)
    .describe("Related tournaments or series labels, if any"),
  series_id: z
    .string()
    .uuid()
    .nullable()
    .describe("Only a catalog series id when status=known and sure; else null"),
});

const BatchOut = z.object({
  items: z.array(ItemOut),
});

export type EnrichPathwayResult = {
  considered: number;
  updated: number;
  skippedCache: number;
  aiCalled: number;
  tokensIn: number;
  tokensOut: number;
  model: string | null;
};

type Row = {
  id: string;
  name: string;
  city: string;
  state: string;
  organizer_name: string | null;
  source: string;
  source_url: string | null;
  series_id: string | null;
  pathway_status: string | null;
  pathway_input_hash: string | null;
};

function modelId(): string {
  return process.env.ENRICH_MODEL?.trim() || DEFAULT_MODEL;
}

function enrichmentEnabled(): boolean {
  if (process.env.ENRICH_PATHWAYS === "0") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function startRun(
  client: SupabaseClient,
  source: string | undefined,
  model: string
): Promise<string | null> {
  const { data, error } = await client
    .from("enrichment_runs")
    .insert({
      kind: "pathway",
      source: source ?? null,
      status: "running",
      model,
      prompt_version: PROMPT_VERSION,
    })
    .select("id")
    .single();
  if (error) {
    console.warn(`enrichment_runs insert skipped: ${error.message}`);
    return null;
  }
  return data.id as string;
}

async function finishRun(
  client: SupabaseClient,
  runId: string | null,
  patch: Record<string, unknown>
): Promise<void> {
  if (!runId) return;
  await client
    .from("enrichment_runs")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", runId);
}

/**
 * Enrich pathway fields for competitions (optionally limited to ids from a scrape).
 */
export async function enrichPathways(
  client: SupabaseClient,
  opts: { competitionIds?: string[]; source?: string } = {}
): Promise<EnrichPathwayResult> {
  const empty: EnrichPathwayResult = {
    considered: 0,
    updated: 0,
    skippedCache: 0,
    aiCalled: 0,
    tokensIn: 0,
    tokensOut: 0,
    model: null,
  };

  if (!enrichmentEnabled()) {
    console.log(
      "Pathway enrichment skipped (set OPENAI_API_KEY in .env and ENRICH_PATHWAYS!=0)."
    );
    return empty;
  }

  const model = modelId();
  const runId = await startRun(client, opts.source, model);

  const selectCols =
    "id, name, city, state, organizer_name, source, source_url, series_id, pathway_status, pathway_input_hash";

  const rows: Row[] = [];
  try {
    if (opts.competitionIds?.length) {
      for (const ids of chunkIds(opts.competitionIds)) {
        const { data, error } = await client
          .from("competitions")
          .select(selectCols)
          .neq("status", "archived")
          .in("id", ids);
        if (error) throw new Error(error.message);
        rows.push(...((data ?? []) as Row[]));
      }
    } else {
      let query = client
        .from("competitions")
        .select(selectCols)
        .neq("status", "archived");
      if (opts.source) query = query.eq("source", opts.source);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as Row[]));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(client, runId, {
      status: "failed",
      error: message,
    });
    throw new Error(`pathway enrich lookup failed: ${message}`);
  }
  const result: EnrichPathwayResult = {
    ...empty,
    considered: rows.length,
    model,
  };

  const needsAi: Row[] = [];

  for (const row of rows) {
    const hash = pathwayInputHash({
      name: row.name,
      state: row.state,
      city: row.city,
      organizer_name: row.organizer_name,
      source: row.source,
      series_id: row.series_id,
    });

    if (row.pathway_input_hash === hash && row.pathway_status) {
      result.skippedCache += 1;
      continue;
    }

    const triage = triagePathway(row.name, row.state);

    if (triage.kind === "known_series") {
      const ok = await applyPathway(client, row.id, {
        pathway_status: "known",
        pathway_summary: triage.summary,
        pathway_related: [{ name: triage.label, note: "Curated series match" }],
        pathway_input_hash: hash,
        pathway_model: "heuristic",
        series_id: row.series_id ?? triage.seriesId,
      });
      if (ok) result.updated += 1;
      continue;
    }

    if (triage.kind === "none") {
      const ok = await applyPathway(client, row.id, {
        pathway_status: "none",
        pathway_summary: triage.summary,
        pathway_related: [],
        pathway_input_hash: hash,
        pathway_model: "heuristic",
      });
      if (ok) result.updated += 1;
      continue;
    }

    needsAi.push(row);
  }

  const aiQueue = needsAi.slice(0, MAX_AI);
  if (needsAi.length > MAX_AI) {
    console.warn(
      `Pathway AI capped at ${MAX_AI} (had ${needsAi.length} suspects). Set ENRICH_MAX_AI to raise.`
    );
  }

  for (let i = 0; i < aiQueue.length; i += BATCH_SIZE) {
    const batch = aiQueue.slice(i, i + BATCH_SIZE);
    try {
      const { items, usage } = await classifyBatch(batch, model);
      result.aiCalled += 1;
      result.tokensIn += usage.inputTokens ?? 0;
      result.tokensOut += usage.outputTokens ?? 0;

      const byId = new Map(items.map((it) => [it.id, it]));
      for (const row of batch) {
        const hash = pathwayInputHash({
          name: row.name,
          state: row.state,
          city: row.city,
          organizer_name: row.organizer_name,
          source: row.source,
          series_id: row.series_id,
        });
        const hit = byId.get(row.id);
        if (!hit) {
          // Model missed an id — mark uncertain rather than inventing certainty.
          const ok = await applyPathway(client, row.id, {
            pathway_status: "uncertain",
            pathway_summary:
              "We are not sure whether this event feeds a qualifier. Check the organizer site for pathway details.",
            pathway_related: [],
            pathway_input_hash: hash,
            pathway_model: model,
          });
          if (ok) result.updated += 1;
          continue;
        }

        const catalogIds = new Set(SeriesCatalog.map((s) => s.id));
        const seriesId =
          hit.status === "known" &&
          hit.series_id &&
          catalogIds.has(hit.series_id)
            ? hit.series_id
            : undefined;

        const ok = await applyPathway(client, row.id, {
          pathway_status: hit.status,
          pathway_summary: hit.summary,
          pathway_related: hit.related.map((r) => ({
            name: r.name,
            ...(r.note ? { note: r.note } : {}),
          })),
          pathway_input_hash: hash,
          pathway_model: model,
          ...(seriesId && !row.series_id ? { series_id: seriesId } : {}),
        });
        if (ok) result.updated += 1;
      }
    } catch (err) {
      console.warn(
        `Pathway AI batch failed: ${err instanceof Error ? err.message : String(err)}`
      );
      for (const row of batch) {
        const hash = pathwayInputHash({
          name: row.name,
          state: row.state,
          city: row.city,
          organizer_name: row.organizer_name,
          source: row.source,
          series_id: row.series_id,
        });
        await applyPathway(client, row.id, {
          pathway_status: "uncertain",
          pathway_summary:
            "We are not sure whether this event feeds a qualifier. Check the organizer site for pathway details.",
          pathway_related: [],
          pathway_input_hash: hash,
          pathway_model: `${model}:error`,
        });
        result.updated += 1;
      }
    }
  }

  await finishRun(client, runId, {
    status: "succeeded",
    rows_considered: result.considered,
    rows_updated: result.updated,
    rows_skipped_cache: result.skippedCache,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    meta: {
      ai_batches: result.aiCalled,
      ai_queue: aiQueue.length,
      prompt_version: PROMPT_VERSION,
    },
  });

  console.log(
    `Pathway enrich: considered=${result.considered} updated=${result.updated} ` +
      `cache_skip=${result.skippedCache} ai_batches=${result.aiCalled} ` +
      `tokens_in=${result.tokensIn} tokens_out=${result.tokensOut}`
  );

  return result;
}

async function applyPathway(
  client: SupabaseClient,
  id: string,
  patch: {
    pathway_status: string;
    pathway_summary: string;
    pathway_related: { name: string; note?: string }[];
    pathway_input_hash: string;
    pathway_model: string;
    series_id?: string;
  }
): Promise<boolean> {
  const { error } = await client
    .from("competitions")
    .update({
      ...patch,
      pathway_enriched_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    if (
      error.message.includes("pathway_status") ||
      error.message.includes("pathway_summary")
    ) {
      console.warn(
        "pathway columns missing — run supabase/migrations/0007_pathway_enrichment.sql"
      );
      return false;
    }
    console.warn(`pathway update failed for ${id}: ${error.message}`);
    return false;
  }
  return true;
}

async function classifyBatch(
  rows: Row[],
  model: string
): Promise<{
  items: z.infer<typeof ItemOut>[];
  usage: { inputTokens?: number; outputTokens?: number };
}> {
  const catalog = SeriesCatalog.map((s) => `${s.id} — ${s.label}`).join("\n");
  const payload = rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    organizer: r.organizer_name,
    source: r.source,
    source_url: r.source_url,
    series_id: r.series_id,
  }));

  // Stable fingerprint for logs / debugging (not sent as cache key to provider).
  const batchHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);

  const { output, usage } = await generateText({
    model: openai(model),
    output: Output.object({
      name: "PathwayBatch",
      description: "Pathway classifications for a batch of chess tournaments",
      schema: BatchOut,
    }),
    prompt: `You classify US scholastic/open chess tournaments for Causey.

Rules:
- Default to status "none" unless there is a clear qualifier / championship / invitational signal in the name or known series.
- Use "uncertain" when it might feed a pathway but you cannot confirm — tell the user to check the organizer site.
- Use "known" only when you can name the path or match a catalog series_id.
- series_id must be null OR exactly one id from the catalog below. Never invent UUIDs.
- Keep summary under 280 characters, plain and specific. No hype. No em-dashes.
- related: short list of related tournament/series names when useful; else [].

Catalog series:
${catalog}

Batch ${batchHash} — classify every id:
${JSON.stringify(payload)}
`,
  });

  if (!output) {
    throw new Error("No structured pathway output from model");
  }

  return {
    items: output.items,
    usage: {
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    },
  };
}
