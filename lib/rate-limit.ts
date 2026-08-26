import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const RATE_LIMIT_MESSAGE =
  "That action is happening too often. Wait a minute and try again.";

export type RateLimitBucket =
  | "search"
  | "signup"
  | "join_code"
  | "claim"
  | "csv_import"
  | "comment"
  | "geo";

const LIMITS: Record<RateLimitBucket, { max: number; windowSeconds: number }> = {
  search: { max: 60, windowSeconds: 60 },
  signup: { max: 5, windowSeconds: 60 },
  join_code: { max: 10, windowSeconds: 60 },
  claim: { max: 10, windowSeconds: 60 },
  csv_import: { max: 3, windowSeconds: 60 },
  comment: { max: 10, windowSeconds: 60 },
  geo: { max: 20, windowSeconds: 60 },
};

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function hashedRequestActorKey(userId?: string | null): Promise<string> {
  if (userId) return `user:${userId}`;
  const headerList = await headers();
  const forwarded =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown";
  const digest = createHash("sha256")
    .update(`causey-rate:${forwarded}`)
    .digest("hex");
  return `ip:${digest}`;
}

/**
 * Returns true when the caller may proceed. Local mock mode is unlimited.
 * Missing RPC/schema fails closed in supabase mode.
 */
export async function consumeRateLimit(
  bucket: RateLimitBucket,
  actorKey: string
): Promise<boolean> {
  if ((process.env.DATA_SOURCE ?? "mock") !== "supabase") return true;
  if (!supabaseConfigured()) return true;

  const limit = LIMITS[bucket];
  const client =
    actorKey.startsWith("user:")
      ? await createServerSupabaseClient()
      : getSupabaseClient();
  if (!client) return false;

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_actor_key: actorKey,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) return false;
  return data === true;
}
