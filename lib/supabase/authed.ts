import type { SupabaseClient } from "@supabase/supabase-js";

/** Cookie SSR client or Bearer JWT client — both expose .from / .rpc. */
export type AuthedSupabase = Pick<SupabaseClient, "from" | "rpc">;
