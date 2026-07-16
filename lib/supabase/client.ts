import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Null-safe Supabase client factory. With an empty .env this returns null and
 * nothing ever attempts a network call — the app must boot with zero secrets.
 */

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey ? createClient(url, anonKey) : null;
  return cached;
}

/**
 * Service-role client for scripts (seeding, ingestion). Server-side only —
 * never import from anything that ships to the browser.
 */
export function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? createClient(url, serviceKey) : null;
}
