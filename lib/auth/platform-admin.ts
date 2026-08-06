import "server-only";

import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Platform administration is deliberately separate from profile and
 * organization roles. The database RPC only answers for auth.uid().
 */
export async function getPlatformAdminUser() {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error || data !== true) return null;

  return user;
}

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  return Boolean(await getPlatformAdminUser());
}
