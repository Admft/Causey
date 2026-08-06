"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import {
  getTournamentZip,
  insertTournamentRecord,
  updateTournamentRecord,
} from "@/lib/data/tournament-mutations";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TournamentCreateSchema,
  TournamentUpdateSchema,
  type TournamentCreateInput,
  type TournamentUpdateInput,
} from "@/lib/validation/tournament";

const AdminOrgCreateSchema = z.object({
  name: z.string().trim().min(2, "Name the organization.").max(80),
  type: z.enum(["school", "district"]),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

const AdminStatusSchema = z.object({
  competitionId: z.string().uuid(),
  eventSlug: z.string().min(1),
  status: z.enum([
    "draft",
    "pending_review",
    "published",
    "rejected",
    "archived",
  ]),
});

const AdminReviewSchema = z
  .object({
    competitionId: z.string().uuid(),
    eventSlug: z.string().min(1),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "reject" && !value.note) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Add a review note explaining what needs correction.",
      });
    }
  });

export async function adminCreateOrganization(input: {
  name: string;
  type: string;
  state: string;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = AdminOrgCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const base = slugifyName(parsed.data.name);
  if (!base) return { ok: false, error: "Name the organization." };

  const supabase = await createServerSupabaseClient();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.data.name,
        slug,
        type: parsed.data.type,
        state: parsed.data.state,
        created_by: admin.id,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: "Could not create the organization." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/organizations");
    return { ok: true, id: data.id, slug: data.slug };
  }

  return { ok: false, error: "That name is already in use." };
}

export async function adminCreateTournament(
  input: TournamentCreateInput
): Promise<ActionResult<{ slug: string }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = TournamentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };

  const zipResult = await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;

  const result = await insertTournamentRecord({
    supabase,
    values,
    orgName: org.name,
    profileId: admin.id,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
    status: "draft",
  });
  if (!result.ok) return result;

  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  return result;
}

export async function adminUpdateTournament(
  input: TournamentUpdateInput
): Promise<ActionResult<{ slug: string }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = TournamentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const supabase = await createServerSupabaseClient();
  const zipResult = await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;

  const result = await updateTournamentRecord({
    supabase,
    values,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
  });
  if (!result.ok) return result;

  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${values.competitionId}/edit`);
  revalidatePath("/chess");
  revalidatePath(`/event/${values.eventSlug}`);
  return result;
}

export async function adminSetTournamentStatus(input: {
  competitionId: string;
  eventSlug: string;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
}): Promise<
  ActionResult<{
    status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  }>
> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = AdminStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid tournament status change." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competitions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.competitionId)
    .select("id");
  if (error || !data?.length) {
    return { ok: false, error: "Could not update the tournament status." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath("/chess");
  revalidatePath(`/event/${parsed.data.eventSlug}`);
  return { ok: true, status: parsed.data.status };
}

export async function adminReviewTournament(input: {
  competitionId: string;
  eventSlug: string;
  decision: "approve" | "reject";
  note?: string;
}): Promise<ActionResult<{ status: "published" | "rejected" }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };
  const parsed = AdminReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the review decision.",
    };
  }

  const status = parsed.data.decision === "approve" ? "published" : "rejected";
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competitions")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      moderation_note: parsed.data.note || null,
    })
    .eq("id", parsed.data.competitionId)
    .eq("status", "pending_review")
    .select("id");
  if (error || !data?.length) {
    return { ok: false, error: "This tournament is no longer awaiting review." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/moderation");
  revalidatePath("/chess");
  revalidatePath(`/event/${parsed.data.eventSlug}`);
  return { ok: true, status };
}
