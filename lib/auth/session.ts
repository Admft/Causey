import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/types";

export const PROFILE_SELECT =
  "id, role, display_name, date_of_birth, age_band, state, zip, interests, preferred_competition_category, grade, credential_ids, role_unlocked, created_at, updated_at";

export async function hasSupabaseAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((cookie) => cookie.name.includes("-auth-token"));
}

export const getSessionUser = cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!(await hasSupabaseAuthCookie())) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    interests: Array.isArray(data.interests) ? data.interests : [],
    preferred_competition_category:
      data.preferred_competition_category ?? null,
    grade: typeof data.grade === "number" ? data.grade : null,
    credential_ids:
      data.credential_ids &&
      typeof data.credential_ids === "object" &&
      !Array.isArray(data.credential_ids)
        ? data.credential_ids
        : {},
  } as Profile;
});
