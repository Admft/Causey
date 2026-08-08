"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { isValidJoinCode } from "@/lib/org-codes";
import { canCreateOrg } from "@/lib/org-permissions";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const OrgCreateSchema = z.object({
  name: z.string().trim().min(2, "Name your organization.").max(80),
  type: z.enum(["school", "club", "team"]),
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
    return { ok: false, error: "Only coach / organizer accounts can start an organization." };
  }

  const supabase = await createServerSupabaseClient();
  const base = slugifyName(parsed.data.name);
  if (!base) return { ok: false, error: "Name your organization." };

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
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue; // slug taken — retry with suffix
      return { ok: false, error: "Could not create the organization. Try again." };
    }

    const { error: memberError } = await supabase.from("org_memberships").insert({
      org_id: org.id,
      profile_id: profile.id,
      role: "coach",
      status: "active",
    });
    if (memberError && memberError.code !== "23505") {
      // Org exists and created_by still grants coach powers — not fatal.
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
  if (!isValidJoinCode(code)) {
    return { ok: false, error: "That code didn’t match an organization." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("join_org_with_code", {
    p_code: code,
  });
  if (error || !data?.length) {
    return { ok: false, error: "That code didn’t match an organization." };
  }

  revalidatePath("/orgs");
  return { ok: true, slug: data[0].org_slug, name: data[0].org_name };
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
  const { error } = await supabase
    .from("org_memberships")
    .update({ status: "removed" })
    .eq("org_id", orgId)
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: "Could not remove this member." };

  // Drop them from the org's groups too.
  const { data: groups } = await supabase
    .from("org_groups")
    .select("id")
    .eq("org_id", orgId);
  const groupIds = (groups ?? []).map((g) => g.id);
  if (groupIds.length) {
    await supabase
      .from("org_group_members")
      .delete()
      .in("group_id", groupIds)
      .eq("profile_id", profileId);
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  revalidatePath(`/orgs/${orgSlug}`);
  return { ok: true };
}

export async function leaveOrg(orgId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("org_memberships")
    .update({ status: "removed" })
    .eq("org_id", orgId)
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: "Could not leave this organization." };

  revalidatePath("/orgs");
  return { ok: true };
}
