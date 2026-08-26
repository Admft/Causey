import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionErrorMessage } from "@/lib/actions/errors";
import { getSessionUser } from "@/lib/auth/session";
import {
  isNotificationKind,
  type NotificationKind,
} from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  recipientId: z.string().uuid(),
  kind: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(1000),
  href: z.string().trim().max(500).nullable().optional(),
  entityType: z.string().trim().max(80).nullable().optional(),
  entityId: z.string().trim().max(120).nullable().optional(),
  dedupeKey: z.string().trim().max(240).nullable().optional(),
});

export type CreateInAppNotificationInput = {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
};

export type NotificationFanoutResult = {
  requested: number;
  created: number;
  failures: { index: number; error: string }[];
};

const FANOUT_CONCURRENCY = 10;

/**
 * Internal notification writer. This module intentionally has no "use server"
 * directive, so callers cannot invoke this helper as a public server action.
 */
export async function createInAppNotifications(
  inputs: CreateInAppNotificationInput[]
): Promise<NotificationFanoutResult> {
  if (!inputs.length) return { requested: 0, created: 0, failures: [] };

  const user = await getSessionUser();
  if (!user) {
    return {
      requested: inputs.length,
      created: 0,
      failures: inputs.map((_, index) => ({
        index,
        error: "Sign in to continue.",
      })),
    };
  }

  const supabase = await createServerSupabaseClient();
  const failures: NotificationFanoutResult["failures"] = [];
  let created = 0;

  for (let start = 0; start < inputs.length; start += FANOUT_CONCURRENCY) {
    const batch = inputs.slice(start, start + FANOUT_CONCURRENCY);
    const outcomes = await Promise.all(
      batch.map(async (input, batchIndex) => {
        const index = start + batchIndex;
        if (!isNotificationKind(input.kind)) {
          return { index, error: "Invalid notification kind." };
        }
        const parsed = CreateSchema.safeParse(input);
        if (!parsed.success) {
          return { index, error: "Invalid notification payload." };
        }
        const { error } = await supabase.rpc("create_in_app_notification", {
          p_recipient_id: parsed.data.recipientId,
          p_kind: parsed.data.kind,
          p_title: parsed.data.title,
          p_body: parsed.data.body,
          p_href: parsed.data.href ?? null,
          p_entity_type: parsed.data.entityType ?? null,
          p_entity_id: parsed.data.entityId ?? null,
          p_dedupe_key: parsed.data.dedupeKey ?? null,
        });
        return error
          ? {
              index,
              error: actionErrorMessage(
                error,
                "Could not create the in-app update."
              ),
            }
          : { index, error: null };
      })
    );

    for (const outcome of outcomes) {
      if (outcome.error) failures.push({ index: outcome.index, error: outcome.error });
      else created += 1;
    }
  }

  if (created) revalidatePath("/me/notifications");
  return { requested: inputs.length, created, failures };
}

export async function getActiveGuardiansForProfiles(
  childIds: string[]
): Promise<{
  guardians: {
    childId: string;
    parentId: string;
    childDisplayName: string;
  }[];
  error: string | null;
}> {
  const unique = [...new Set(childIds)];
  if (!unique.length) return { guardians: [], error: null };
  const user = await getSessionUser();
  if (!user) {
    return { guardians: [], error: "Sign in to continue." };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_active_guardians_for_profiles",
    { p_child_ids: unique }
  );
  if (error) {
    console.error("Guardian lookup failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      guardians: [],
      error: actionErrorMessage(
        error,
        "Could not load linked parents for in-app updates."
      ),
    };
  }
  return {
    guardians: (
      (data ?? []) as {
        child_id: string;
        parent_id: string;
        child_display_name: string;
      }[]
    ).map((row) => ({
      childId: row.child_id,
      parentId: row.parent_id,
      childDisplayName: row.child_display_name,
    })),
    error: null,
  };
}
