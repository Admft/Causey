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

/**
 * Request-bound search data source. Supabase search needs the viewer's cookie
 * session (website) or Bearer token (phone) so RLS can include private org
 * events and rank their organizations.
 */
export async function getRequestDataSource(
  request?: Request
): Promise<DataSource> {
  if ((process.env.DATA_SOURCE ?? "mock") !== "supabase") {
    return getDataSource();
  }

  if (request) {
    const { accessTokenFromRequest, createSupabaseClientWithAccessToken } =
      await import("@/lib/supabase/access-token");
    const token = accessTokenFromRequest(request);
    if (token) {
      return new SupabaseDataSource(createSupabaseClientWithAccessToken(token));
    }
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  return new SupabaseDataSource(await createServerSupabaseClient());
}

export type { DataSource } from "@/lib/data/types";
