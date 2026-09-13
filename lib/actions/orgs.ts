"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { performJoinOrgWithCode } from "@/lib/join-write";
import { canCreateOrg } from "@/lib/org-permissions";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";

const OrgCreateSchema = z.object({
  name: z.string().trim().min(2, "Name your club or team.").max(80),
  type: z.enum(["club", "team"]),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export async function createOrg(input: {
  name: string;
  type: string;
  state: string;
}): Promise<ActionResult<{ slug: string }>> {
  const parsed = OrgCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach accounts can start a club or team." };
  }

  const supabase = await createServerSupabaseClient();
  const base = slugifyName(parsed.data.name);
  if (!base) return { ok: false, error: "Name your club or team." };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.data.name,
        slug,
        type: parsed.data.type,
        state: parsed.data.state,
        created_by: profile.id,
        owner_profile_id: profile.id,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue; // slug taken — retry with suffix
      return { ok: false, error: "Could not create the club. Try again." };
    }

    const { data: membership, error: memberError } = await supabase
      .from("org_memberships")
      .insert({
        org_id: org.id,
        profile_id: profile.id,
        role: "coach",
        status: "active",
      })
      .select("profile_id")
      .maybeSingle();
    if (memberError || !membership) {
      revalidatePath("/orgs");
      return {
        ok: false,
        error:
          "The club was created, but your staff membership could not be set up. Contact support before retrying.",
      };
    }

    revalidatePath("/orgs");
    return { ok: true, slug: org.slug };
  }
  return { ok: false, error: "That name is taken — try a different one." };
}

export async function joinOrgWithCode(
  code: string
): Promise<ActionResult<{ slug: string; name: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to join an organization." };

  const supabase = await createServerSupabaseClient();
  const result = await performJoinOrgWithCode({ supabase, code });
  if (result.ok) revalidatePath("/orgs");
  return result;
}

export async function rotateJoinCode(
  orgId: string,
  orgSlug: string
): Promise<ActionResult<{ code: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("rotate_join_code", {
    p_org_id: orgId,
  });
  if (error || !data) {
    return { ok: false, error: "Could not rotate the code. Try again." };
  }

  revalidatePath(`/orgs/${orgSlug}`);
  return { ok: true, code: data as string };
}

export async function removeMember(
  orgId: string,
  orgSlug: string,
  profileId: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("remove_organization_member", {
    p_org_id: orgId,
    p_profile_id: profileId,
  });
  if (error) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That member was not found or could not be removed.",
        "You don’t have permission to remove this member."
      ),
    };
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  revalidatePath(`/orgs/${orgSlug}/people`);
  revalidatePath(`/orgs/${orgSlug}`);
  return { ok: true };
}

export async function leaveOrg(orgId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("leave_organization", {
    p_org_id: orgId,
  });
  if (error) {
    if (error.message?.includes("protected_owner_cannot_be_revoked")) {
      return {
        ok: false,
        error: "Transfer organization ownership before leaving.",
      };
    }
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "You are not an active member of this organization.",
        "You don’t have permission to leave this organization."
      ),
    };
  }

  revalidatePath("/orgs");
  return { ok: true };
}
