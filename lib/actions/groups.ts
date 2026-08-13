"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";

const GroupNameSchema = z.string().trim().min(1, "Name the group.").max(60);

function missingSetMembersRpc(error: { code?: string; message?: string }): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("set_group_members") && message.includes("not find")
  );
}

async function setGroupMembersWithoutRpc(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  groupId: string,
  profileIds: string[]
): Promise<ActionResult> {
  const { data: current, error: readError } = await supabase
    .from("org_group_members")
    .select("profile_id")
    .eq("group_id", groupId);
  if (readError) {
    return { ok: false, error: "Could not load the current group members." };
  }

  const currentIds = new Set((current ?? []).map((row) => row.profile_id as string));
  const desiredIds = new Set(profileIds);
  const additions = profileIds.filter((profileId) => !currentIds.has(profileId));
  const removals = [...currentIds].filter((profileId) => !desiredIds.has(profileId));

  // Insert first: if validation or RLS rejects a new member, existing members
  // remain untouched. This fallback can be removed once set_group_members is
  // present in every environment.
  if (additions.length) {
    const { data: inserted, error: insertError } = await supabase
      .from("org_group_members")
      .insert(
        additions.map((profileId) => ({ group_id: groupId, profile_id: profileId }))
      )
      .select("profile_id");
    if (insertError || inserted?.length !== additions.length) {
      return {
        ok: false,
        error: "Could not add the selected members. Existing members were kept.",
      };
    }
  }

  if (removals.length) {
    const { count, error: removeError } = await supabase
      .from("org_group_members")
      .delete({ count: "exact" })
      .eq("group_id", groupId)
      .in("profile_id", removals);
    if (removeError || count !== removals.length) {
      return {
        ok: false,
        error:
          "New members were saved, but some previous members could not be removed.",
      };
    }
  }

  return { ok: true };
}

export async function createGroup(
  orgId: string,
  orgSlug: string,
  name: string
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const parsed = GroupNameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Name the group." };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("org_groups")
    .insert({ org_id: orgId, name: parsed.data })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "A group with that name already exists."
          : actionErrorMessage(
              error,
              "Could not create the group.",
              "You don’t have permission to create groups for this organization."
            ),
    };
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  return { ok: true, id: data.id };
}

export async function deleteGroup(
  groupId: string,
  orgSlug: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("org_groups")
    .delete({ count: "exact" })
    .eq("id", groupId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That group was not found or could not be deleted.",
        "You don’t have permission to delete this group."
      ),
    };
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  return { ok: true };
}

/** Replace a group's membership with exactly `profileIds`. */
export async function setGroupMembers(
  groupId: string,
  orgSlug: string,
  profileIds: string[]
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const parsed = z
    .object({
      groupId: z.string().uuid(),
      profileIds: z.array(z.string().uuid()).max(500),
    })
    .safeParse({ groupId, profileIds: [...new Set(profileIds)] });
  if (!parsed.success) {
    return { ok: false, error: "Choose valid group members." };
  }

  const supabase = await createServerSupabaseClient();
  // The SQL function owns the delete+insert transaction. Keep this action on
  // the RPC boundary so a failed insert can never leave the group empty.
  const { error } = await supabase.rpc("set_group_members", {
    p_group_id: parsed.data.groupId,
    p_profile_ids: parsed.data.profileIds,
  });
  if (error && missingSetMembersRpc(error)) {
    const fallback = await setGroupMembersWithoutRpc(
      supabase,
      parsed.data.groupId,
      parsed.data.profileIds
    );
    if (!fallback.ok) return fallback;
  } else if (error) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "Could not update the group.",
        "You don’t have permission to update this group."
      ),
    };
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  return { ok: true };
}
