"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const GroupNameSchema = z.string().trim().min(1, "Name the group.").max(60);

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

  // #region agent log
  const { debugAgentLog, debugOperatorPermissions } = await import(
    "@/lib/debug/operator-permissions"
  );
  const perms = await debugOperatorPermissions(supabase, user.id, orgId);
  debugAgentLog({
    hypothesisId: "B",
    location: "lib/actions/groups.ts:createGroup",
    message: "create group permission snapshot",
    data: { orgSlug, ...perms },
  });
  // #endregion

  const { data, error } = await supabase
    .from("org_groups")
    .insert({ org_id: orgId, name: parsed.data })
    .select("id")
    .single();
  if (error) {
    // #region agent log
    debugAgentLog({
      hypothesisId: "B",
      location: "lib/actions/groups.ts:createGroup:insert",
      message: "create group failed",
      data: { code: error.code, err: error.message, ...perms },
    });
    // #endregion
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "A group with that name already exists."
          : "Could not create the group.",
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
  const { error } = await supabase.from("org_groups").delete().eq("id", groupId);
  if (error) return { ok: false, error: "Could not delete the group." };

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

  const supabase = await createServerSupabaseClient();
  const { error: clearError } = await supabase
    .from("org_group_members")
    .delete()
    .eq("group_id", groupId);
  if (clearError) return { ok: false, error: "Could not update the group." };

  if (profileIds.length) {
    const { error: insertError } = await supabase.from("org_group_members").insert(
      profileIds.map((profileId) => ({ group_id: groupId, profile_id: profileId }))
    );
    if (insertError) return { ok: false, error: "Could not update the group." };
  }

  revalidatePath(`/orgs/${orgSlug}/roster`);
  return { ok: true };
}
