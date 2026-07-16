import type { DataSource } from "@/lib/data/types";
import { MockDataSource } from "@/lib/data/mock";
import { SupabaseDataSource } from "@/lib/data/supabase";

/**
 * Env-selected DataSource. DATA_SOURCE=mock (default) | supabase.
 * Going live later means: create the Supabase project, run the migration,
 * seed, set DATA_SOURCE=supabase. No app-code changes.
 */

let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (instance) return instance;
  const mode = process.env.DATA_SOURCE ?? "mock";
  if (mode === "supabase") {
    instance = new SupabaseDataSource();
  } else {
    instance = new MockDataSource();
  }
  return instance;
}

export type { DataSource } from "@/lib/data/types";
