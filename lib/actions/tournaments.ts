"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import {
  getTournamentZip,
  insertTournamentRecord,
  updateTournamentRecord,
} from "@/lib/data/tournament-mutations";
import {
  TournamentDraftDataSchema,
  type TournamentDraftData,
} from "@/lib/schemas";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";
import {
  TournamentCreateSchema as ValidatedTournamentCreateSchema,
  TournamentUpdateSchema as ValidatedTournamentUpdateSchema,
  type TournamentCreateInput,
  type TournamentUpdateInput,
} from "@/lib/validation/tournament";

export type { TournamentCreateInput, TournamentUpdateInput };
export type TournamentPublicationStatus = "published" | "pending_review";
type TournamentPublicationResult = {
  slug: string;
  status: TournamentPublicationStatus;
};

const TournamentCreateSchema = ValidatedTournamentCreateSchema;

const TournamentDraftSaveSchema = z.object({
  draftId: z.string().uuid(),
  orgId: z.string().uuid(),
  data: TournamentDraftDataSchema,
  coverImagePath: z.string().max(500).optional(),
});

const TournamentDraftPublishSchema = z.object({
  draftId: z.string().uuid(),
  orgId: z.string().uuid(),
  orgSlug: z.string().min(1),
});

export type TournamentDraftSaveInput = {
  draftId: string;
  orgId: string;
  data: TournamentDraftData;
  coverImagePath?: string;
};

async function canOperateOrganizationTournament(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  profileId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_operate_org_competitions", {
    p_org_id: orgId,
    p_profile_id: profileId,
  });
  if (!error && data === true) return true;
  return Boolean(await getPlatformAdminUser());
}

/**
 * Organizer/admin create path (SEC-06): events start as drafts and stay out of
 * public discovery until publishTournament / PublishTournamentPanel.
 */
export async function createTournament(
  input: TournamentCreateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = ValidatedTournamentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  if (
    !(await canOperateOrganizationTournament(
      supabase,
      values.orgId,
      profile.id
    ))
  ) {
    return {
      ok: false,
      error:
        "Only a coach or organization administrator can create competitions.",
    };
  }
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, created_by")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };

  const zipResult =
    values.participationMode === "online"
      ? ({ ok: true, lat: null, lng: null } as const)
      : await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;

  const result = await insertTournamentRecord({
    supabase,
    values,
    orgName: org.name,
    profileId: profile.id,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
    status: "draft",
  });
  if (!result.ok) return result;

  revalidatePath(`/orgs/${values.orgSlug}`);
  return result;
}

/**
 * Draft competition -> published. Used by PublishTournamentPanel / admin.
 */
export async function publishTournament(input: {
  competitionId: string;
  eventSlug: string;
}): Promise<ActionResult<{ status: TournamentPublicationStatus }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("competitions")
    .select("organizations(slug)")
    .eq("id", input.competitionId)
    .maybeSingle();

  const { data: updated, error } = await supabase
    .from("competitions")
    .update({ status: "published" })
    .eq("id", input.competitionId)
    .eq("status", "draft")
    .select("status")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Could not publish this competition." };
  }
  const status: TournamentPublicationStatus =
    updated.status === "pending_review" ? "pending_review" : "published";

  const orgSlug = (existing?.organizations as { slug?: string } | null)?.slug;
  revalidatePath("/chess");
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/event/${input.eventSlug}/manage`);
  if (orgSlug) revalidatePath(`/orgs/${orgSlug}`);
  return { ok: true, status };
}

/**
 * Save incomplete organizer input in Postgres. The stable client-provided UUID
 * lets rapid autosaves update one row instead of racing to create duplicates.
 */
export async function saveTournamentDraft(
  input: TournamentDraftSaveInput
): Promise<
  ActionResult<{
    draftId: string;
    coverImageUrl: string | null;
    savedAt: string;
  }>
> {
  const parsed = TournamentDraftSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the draft." };
  }
  const values = parsed.data;
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to save this draft." };

  const supabase = await createServerSupabaseClient();
  if (
    !(await canOperateOrganizationTournament(
      supabase,
      values.orgId,
      profile.id
    ))
  ) {
    return {
      ok: false,
      error: "Only staff for this organization can save competitions.",
    };
  }
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "You can’t save competitions for this organization." };

  const { data: existing, error: readError } = await supabase
    .from("tournament_drafts")
    .select("id, cover_image_url, cover_image_path")
    .eq("id", values.draftId)
    .eq("org_id", values.orgId)
    .maybeSingle();
  if (readError) {
    console.error("Tournament draft read failed:", {
      code: readError.code,
      message: readError.message,
    });
    return {
      ok: false,
      error: "Could not save the draft. Try again later.",
    };
  }

  let coverImageUrl = (existing?.cover_image_url as string | null | undefined) ?? null;
  let coverImagePath = (existing?.cover_image_path as string | null | undefined) ?? null;
  if (values.coverImagePath !== undefined) {
    const expectedPrefix = `${values.orgId}/${values.draftId}/`;
    if (!values.coverImagePath.startsWith(expectedPrefix)) {
      return { ok: false, error: "That cover image does not belong to this draft." };
    }
    coverImagePath = values.coverImagePath;
    coverImageUrl = supabase.storage
      .from("tournament-covers")
      .getPublicUrl(values.coverImagePath).data.publicUrl;
  }

  const savedAt = new Date().toISOString();
  const payload = {
    data: values.data,
    cover_image_url: coverImageUrl,
    cover_image_path: coverImagePath,
    updated_at: savedAt,
  };
  const write = existing
    ? await supabase
        .from("tournament_drafts")
        .update(payload)
        .eq("id", values.draftId)
        .eq("org_id", values.orgId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("tournament_drafts")
        .insert({
          id: values.draftId,
          org_id: values.orgId,
          created_by: profile.id,
          ...payload,
        })
        .select("id")
        .maybeSingle();
  if (write.error || !write.data) {
    const message = write.error?.message?.toLowerCase() ?? "";
    return {
      ok: false,
      error:
        message.includes("row-level security") || message.includes("policy")
          ? "You don’t have permission to save drafts for this organization."
          : "Could not save the draft. Try again.",
    };
  }

  const oldPath = existing?.cover_image_path as string | null | undefined;
  if (values.coverImagePath && oldPath && oldPath !== values.coverImagePath) {
    await supabase.storage.from("tournament-covers").remove([oldPath]);
  }
  return {
    ok: true,
    draftId: values.draftId,
    coverImageUrl,
    savedAt,
  };
}

export async function deleteTournamentDraft(input: {
  draftId: string;
  orgId: string;
  orgSlug: string;
}): Promise<ActionResult> {
  const parsed = TournamentDraftPublishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Could not identify the competition draft." };
  }
  const values = parsed.data;
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to discard this draft." };

  const supabase = await createServerSupabaseClient();
  if (
    !(await canOperateOrganizationTournament(
      supabase,
      values.orgId,
      profile.id
    ))
  ) {
    return {
      ok: false,
      error: "Only staff for this organization can discard competition drafts.",
    };
  }

  const { data: draft } = await supabase
    .from("tournament_drafts")
    .select("cover_image_path")
    .eq("id", values.draftId)
    .eq("org_id", values.orgId)
    .maybeSingle();
  const { count, error } = await supabase
    .from("tournament_drafts")
    .delete({ count: "exact" })
    .eq("id", values.draftId)
    .eq("org_id", values.orgId);
  if (error || !count) {
    return { ok: false, error: "Could not discard this draft. Try again." };
  }

  if (draft?.cover_image_path) {
    await supabase.storage
      .from("tournament-covers")
      .remove([draft.cover_image_path]);
  }
  revalidatePath(`/orgs/${values.orgSlug}`);
  revalidatePath(`/orgs/${values.orgSlug}/competitions`);
  return { ok: true };
}

function draftFeeToCents(raw: string): ActionResult<{ cents: number | null }> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, cents: null };
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return { ok: false, error: "Entry fee must be a dollar amount." };
  }
  return { ok: true, cents: Math.round(dollars * 100) };
}

async function findDraftPublication(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  draftId: string,
  orgId: string
): Promise<TournamentPublicationResult | null> {
  const { data } = await supabase
    .from("competitions")
    .select("slug, status")
    .eq("source_draft_id", draftId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (
    !data?.slug ||
    (data.status !== "published" && data.status !== "pending_review")
  ) {
    return null;
  }
  return {
    slug: data.slug as string,
    status: data.status as TournamentPublicationStatus,
  };
}

/** Validate the saved draft as a whole, publish it, then remove the draft row. */
export async function publishTournamentDraft(
  input: z.input<typeof TournamentDraftPublishSchema>
): Promise<ActionResult<TournamentPublicationResult>> {
  const parsedInput = TournamentDraftPublishSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Could not identify the competition draft." };
  }
  const values = parsedInput.data;
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to publish this competition." };

  const supabase = await createServerSupabaseClient();
  if (
    !(await canOperateOrganizationTournament(
      supabase,
      values.orgId,
      profile.id
    ))
  ) {
    return {
      ok: false,
      error: "Only staff for this organization can publish competitions.",
    };
  }
  const { data: draft, error: draftError } = await supabase
    .from("tournament_drafts")
    .select("data, cover_image_path")
    .eq("id", values.draftId)
    .eq("org_id", values.orgId)
    .maybeSingle();
  if (draftError || !draft) {
    const publication = await findDraftPublication(
      supabase,
      values.draftId,
      values.orgId
    );
    if (publication) return { ok: true, ...publication };
    return { ok: false, error: "Draft not found. Return to the organization and resume it." };
  }
  const coverImagePath = draft.cover_image_path as string | null;
  const expectedCoverPrefix = `${values.orgId}/${values.draftId}/`;
  if (!coverImagePath?.startsWith(expectedCoverPrefix)) {
    return { ok: false, error: "Add a cover image before publishing." };
  }
  const coverFileName = coverImagePath.slice(expectedCoverPrefix.length);
  if (!coverFileName || coverFileName.includes("/")) {
    return { ok: false, error: "The cover image is invalid. Upload it again before publishing." };
  }
  const { data: coverFiles, error: coverError } = await supabase.storage
    .from("tournament-covers")
    .list(`${values.orgId}/${values.draftId}`, {
      limit: 1,
      search: coverFileName,
    });
  if (coverError || !coverFiles?.some((file) => file.name === coverFileName)) {
    return { ok: false, error: "The cover image is missing. Upload it again before publishing." };
  }
  const coverImageUrl = supabase.storage
    .from("tournament-covers")
    .getPublicUrl(coverImagePath).data.publicUrl;

  const draftData = TournamentDraftDataSchema.safeParse(draft.data);
  if (!draftData.success) {
    return { ok: false, error: "The saved draft is incomplete. Review its details." };
  }
  const fee = draftFeeToCents(draftData.data.entryFee);
  if (!fee.ok) return fee;
  const tournament = TournamentCreateSchema.safeParse({
    orgId: values.orgId,
    orgSlug: values.orgSlug,
    category: draftData.data.category,
    customCategoryName: draftData.data.customCategoryName,
    participationMode: draftData.data.participationMode,
    name: draftData.data.name,
    startDate: draftData.data.startDate,
    endDate: draftData.data.endDate || null,
    regDeadline: draftData.data.regDeadline || null,
    venueName: draftData.data.venueName,
    address: draftData.data.address,
    city: draftData.data.city,
    state: draftData.data.state,
    zip: draftData.data.zip,
    entryFeeCents: fee.cents,
    regUrl: draftData.data.regUrl,
    visibility: draftData.data.visibility,
    audience:
      draftData.data.audience ??
      (draftData.data.visibility === "public" ? "public" : "school"),
    sections: draftData.data.sections,
    rated: draftData.data.rated,
  });
  if (!tournament.success) {
    return {
      ok: false,
      error: tournament.error.issues[0]?.message ?? "Review the competition details.",
    };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };
  const { data: zipRow } =
    tournament.data.participationMode === "online"
      ? { data: { lat: null, lng: null } }
      : await supabase
          .from("zips")
          .select("lat, lng")
          .eq("zip", tournament.data.zip)
          .maybeSingle();
  if (!zipRow && tournament.data.participationMode !== "online") {
    return { ok: false, error: "We don’t recognize that zip code — double-check it." };
  }

  const published = await insertWithSlugRetry(
    supabase,
    tournament.data,
    org.name,
    profile.id,
    zipRow ?? { lat: null, lng: null },
    coverImageUrl,
    values.draftId
  );
  if (!published.ok) return published;

  await supabase
    .from("tournament_drafts")
    .delete()
    .eq("id", values.draftId)
    .eq("org_id", values.orgId);
  revalidatePath(`/orgs/${values.orgSlug}`);
  return published;
}

async function insertWithSlugRetry(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  values: z.output<typeof TournamentCreateSchema>,
  orgName: string,
  profileId: string,
  zipRow: { lat: number | null; lng: number | null },
  imageUrl: string,
  sourceDraftId: string
): Promise<ActionResult<TournamentPublicationResult>> {
  const base = slugify(values.name, values.startDate);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: created, error } = await supabase
      .from("competitions")
      .insert({
        slug,
        name: values.name,
        category: values.category,
        custom_category_name: values.customCategoryName,
        participation_mode: values.participationMode,
        organizer_name: orgName,
        venue_name: values.venueName,
        address: values.address,
        city: values.city || null,
        state: values.state || null,
        zip: values.zip || null,
        lat: zipRow.lat,
        lng: zipRow.lng,
        start_date: values.startDate,
        end_date: values.endDate,
        reg_deadline: values.regDeadline,
        reg_url: values.regUrl,
        entry_fee_cents: values.entryFeeCents,
        rated: values.category === "chess" && values.rated,
        rating_system: values.category === "chess" ? "uschess" : null,
        source: "organizer",
        image_url: imageUrl,
        status: "published",
        visibility: values.visibility,
        audience:
          values.audience ??
          (values.visibility === "public" ? "public" : "school"),
        org_id: values.orgId,
        created_by: profileId,
        source_draft_id: sourceDraftId,
      })
      .select("id, slug, status")
      .single();

    if (error) {
      if (error.code === "23505") {
        const publication = await findDraftPublication(
          supabase,
          sourceDraftId,
          values.orgId
        );
        if (publication) return { ok: true, ...publication };
        continue; // Slug taken by another tournament — retry with a suffix.
      }
      return { ok: false, error: "Could not create the competition. Try again." };
    }

    const sections = values.sections?.length
      ? values.sections
      : [
          {
            name: "Open",
            minRating: null,
            maxRating: null,
            minGrade: null,
            maxGrade: null,
            entryFeeCents: null,
          },
        ];
    const { error: sectionError } = await supabase.from("sections").insert(
      sections.map((section) => ({
        competition_id: created.id,
        name: section.name,
        min_rating: values.category === "chess" ? section.minRating : null,
        max_rating: values.category === "chess" ? section.maxRating : null,
        min_grade: section.minGrade,
        max_grade: section.maxGrade,
        entry_fee_cents: section.entryFeeCents,
      }))
    );
    if (sectionError) {
      await supabase
        .from("competitions")
        .update({ status: "archived" })
        .eq("id", created.id);
      return {
        ok: false,
        error:
          "The competition draft was preserved because its divisions could not be published. Try again.",
      };
    }

    if (
      values.category === "chess" &&
      (values.audience === "public" || values.visibility === "public")
    ) {
      revalidatePath("/chess");
    }
    revalidatePath(`/orgs/${values.orgSlug}`);
    return {
      ok: true,
      slug: created.slug,
      status:
        created.status === "pending_review" ? "pending_review" : "published",
    };
  }
  return { ok: false, error: "A competition with that name and date already exists." };
}

/** Edit a hosted tournament. The slug never changes — shared links stay live. */
export async function updateTournament(
  input: TournamentUpdateInput
): Promise<
  ActionResult<{ slug: string; status?: TournamentPublicationStatus }>
> {
  const parsed = ValidatedTournamentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("competitions")
    .select("status, category")
    .eq("id", values.competitionId)
    .maybeSingle();
  const zipResult =
    values.participationMode === "online"
      ? ({ ok: true, lat: null, lng: null } as const)
      : await getTournamentZip(supabase, values.zip);
  if (!zipResult.ok) return zipResult;
  const result = await updateTournamentRecord({
    supabase,
    values,
    zipRow: { lat: zipResult.lat, lng: zipResult.lng },
  });
  if (!result.ok) return result;

  let status: TournamentPublicationStatus | undefined;
  if (existing?.status === "rejected") {
    const { data: resubmitted, error } = await supabase
      .from("competitions")
      .update({
        status: "published",
        submitted_for_review_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
      })
      .eq("id", values.competitionId)
      .eq("status", "rejected")
      .select("status")
      .maybeSingle();
    if (error || !resubmitted) {
      return {
        ok: false,
        error:
          "Changes were saved, but the competition could not be resubmitted. Try again.",
      };
    }
    status =
      resubmitted.status === "pending_review"
        ? "pending_review"
        : "published";
  }

  if (existing?.category === "chess" || values.category === "chess") {
    revalidatePath("/chess");
  }
  revalidatePath(`/event/${values.eventSlug}`);
  revalidatePath(`/event/${values.eventSlug}/manage`);
  revalidatePath(`/orgs/${values.orgSlug}`);
  return { ...result, ...(status ? { status } : {}) };
}

/** Cancel = archive. The event disappears for everyone, including the coach. */
export async function cancelTournament(input: {
  competitionId: string;
  eventSlug: string;
  orgSlug: string;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  // No RETURNING: an archived row is no longer SELECT-visible (even to its
  // coach), so confirm via the affected-row count instead.
  const { count, error } = await supabase
    .from("competitions")
    .update({ status: "archived" }, { count: "exact" })
    .eq("id", input.competitionId);
  if (error || !count) {
    return { ok: false, error: "Could not cancel the competition." };
  }

  revalidatePath("/chess");
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/orgs/${input.orgSlug}`);
  return { ok: true };
}
