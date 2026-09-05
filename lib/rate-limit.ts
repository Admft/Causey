import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/observability";

export const RATE_LIMIT_MESSAGE =
  "That action is happening too often. Wait a minute and try again.";

/** Every bucket here must also be allowlisted in consume_rate_limit (`0075`). */
export type RateLimitBucket =
  | "search"
  | "signup"
  | "join_code"
  | "claim"
  | "csv_import"
  | "comment"
  | "geo"
  | "household";

const LIMITS: Record<RateLimitBucket, { max: number; windowSeconds: number }> = {
  search: { max: 180, windowSeconds: 60 },
  signup: { max: 5, windowSeconds: 60 },
  join_code: { max: 10, windowSeconds: 60 },
  claim: { max: 10, windowSeconds: 60 },
  csv_import: { max: 3, windowSeconds: 60 },
  comment: { max: 10, windowSeconds: 60 },
  geo: { max: 20, windowSeconds: 60 },
  household: { max: 6, windowSeconds: 60 },
};

/** Search/geo stay usable if the limiter RPC is missing or mis-keyed. */
const FAIL_OPEN_ON_LIMITER_ERROR: ReadonlySet<RateLimitBucket> = new Set([
  "search",
  "geo",
]);

const HASHED_IP_ACTOR = /^ip:[a-f0-9]{64}$/;

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function clientIpFromHeaders(headerList: Headers): string {
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    headerList.get("cf-connecting-ip")?.trim() ||
    headerList.get("x-vercel-forwarded-for")?.trim() ||
    headerList.get("x-vercel-ip")?.trim() ||
    "unknown"
  );
}

export async function hashedRequestActorKey(
  userId?: string | null,
  headerSource?: Headers
): Promise<string> {
  if (userId) return `user:${userId}`;
  const headerList = headerSource ?? (await headers());
  const digest = createHash("sha256")
    .update(`causey-rate:${clientIpFromHeaders(headerList)}`)
    .digest("hex");
  return `ip:${digest}`;
}

async function hashedIpActorKey(headerSource?: Headers): Promise<string> {
  return hashedRequestActorKey(null, headerSource);
}

/**
 * Returns true when the caller may proceed. Local mock mode is unlimited.
 * `next dev` skips the RPC so filter typing does not share one "unknown" IP
 * bucket. Authenticated identity comes from the cookie JWT (`0069`); the
 * RPC argument is always `ip:<64 hex>` so a missing JWT cannot raise
 * `invalid_rate_limit_actor`. Search and geo fail open when the RPC errors;
 * signup/join/claim/CSV/comment still fail closed.
 */
export async function consumeRateLimit(
  bucket: RateLimitBucket,
  actorKey: string,
  headerSource?: Headers
): Promise<boolean> {
  if ((process.env.DATA_SOURCE ?? "mock") !== "supabase") return true;
  if (process.env.NODE_ENV !== "production") return true;
  if (!supabaseConfigured()) return true;

  const limit = LIMITS[bucket];
  const failOpen = FAIL_OPEN_ON_LIMITER_ERROR.has(bucket);

  let client;
  try {
    client = await createServerSupabaseClient();
  } catch (error) {
    reportError(error, `consume_rate_limit ${bucket} client`);
    return failOpen;
  }

  const pActorKey = HASHED_IP_ACTOR.test(actorKey)
    ? actorKey
    : await hashedIpActorKey(headerSource);

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_actor_key: pActorKey,
    p_max: limit.max,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    reportError(error, `consume_rate_limit ${bucket}`);
    return failOpen;
  }
  return data === true;
}
