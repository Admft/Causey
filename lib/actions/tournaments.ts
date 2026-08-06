"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { canCreateOrg } from "@/lib/org-permissions";
import {
  TournamentDraftDataSchema,
  type TournamentDraftData,
} from "@/lib/schemas";
import { slugify, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/result";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date.");

const TournamentCreateSchema = z
  .object({
    orgId: z.string().uuid(),
    orgSlug: z.string().min(1),
    name: z.string().trim().min(3, "Name the tournament.").max(120),
    startDate: DateString,
    endDate: DateString.nullable(),
    regDeadline: DateString.nullable(),
    venueName: z.string().trim().max(120).transform((v) => v || null),
    address: z.string().trim().max(160).transform((v) => v || null),
    city: z.string().trim().min(2, "Enter the city.").max(80),
    state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Pick a state."),
    zip: z.string().trim().regex(/^\d{5}$/, "Zip must be 5 digits."),
    entryFeeCents: z.number().int().nonnegative().nullable(),
    regUrl: z
      .string()
      .trim()
      .url("Registration link must be a full URL.")
      .nullable()
      .or(z.literal("").transform(() => null)),
    visibility: z.enum(["public", "private"]),
    rated: z.boolean(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date can’t be before the start date.",
    path: ["endDate"],
  })
  .refine((v) => !v.regDeadline || v.regDeadline <= v.startDate, {
    message: "Registration deadline can’t be after the start date.",
    path: ["regDeadline"],
  });

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
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach / organizer accounts can save tournaments." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "You can’t save tournaments for this organization." };

  const { data: existing, error: readError } = await supabase
    .from("tournament_drafts")
    .select("id, cover_image_url, cover_image_path")
    .eq("id", values.draftId)
    .eq("org_id", values.orgId)
    .maybeSingle();
  if (readError) {
    return { ok: false, error: "Could not save the draft. Try again." };
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
    return { ok: false, error: "Could not save the draft. Try again." };
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

function draftFeeToCents(raw: string): ActionResult<{ cents: number | null }> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, cents: null };
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return { ok: false, error: "Entry fee must be a dollar amount." };
  }
  return { ok: true, cents: Math.round(dollars * 100) };
}

async function findPublishedDraftSlug(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  draftId: string,
  orgId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("competitions")
    .select("slug")
    .eq("source_draft_id", draftId)
    .eq("org_id", orgId)
    .maybeSingle();
  return (data?.slug as string | undefined) ?? null;
}

/** Validate the saved draft as a whole, publish it, then remove the draft row. */
export async function publishTournamentDraft(
  input: z.input<typeof TournamentDraftPublishSchema>
): Promise<ActionResult<{ slug: string }>> {
  const parsedInput = TournamentDraftPublishSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Could not identify the tournament draft." };
  }
  const values = parsedInput.data;
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to publish this tournament." };
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach / organizer accounts can publish tournaments." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: draft, error: draftError } = await supabase
    .from("tournament_drafts")
    .select("data, cover_image_path")
    .eq("id", values.draftId)
    .eq("org_id", values.orgId)
    .maybeSingle();
  if (draftError || !draft) {
    const publishedSlug = await findPublishedDraftSlug(
      supabase,
      values.draftId,
      values.orgId
    );
    if (publishedSlug) return { ok: true, slug: publishedSlug };
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
    rated: draftData.data.rated,
  });
  if (!tournament.success) {
    return {
      ok: false,
      error: tournament.error.issues[0]?.message ?? "Review the tournament details.",
    };
  }

  const [{ data: org }, { data: zipRow }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", values.orgId)
      .maybeSingle(),
    supabase
      .from("zips")
      .select("lat, lng")
      .eq("zip", tournament.data.zip)
      .maybeSingle(),
  ]);
  if (!org) return { ok: false, error: "Organization not found." };
  if (!zipRow) {
    return { ok: false, error: "We don’t recognize that zip code — double-check it." };
  }

  const published = await insertWithSlugRetry(
    supabase,
    tournament.data,
    org.name,
    profile.id,
    zipRow,
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
  zipRow: { lat: number; lng: number },
  imageUrl: string,
  sourceDraftId: string
): Promise<ActionResult<{ slug: string }>> {
  const base = slugify(values.name, values.startDate);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: created, error } = await supabase
      .from("competitions")
      .insert({
        slug,
        name: values.name,
        category: "chess",
        organizer_name: orgName,
        venue_name: values.venueName,
        address: values.address,
        city: values.city,
        state: values.state,
        zip: values.zip,
        lat: zipRow.lat,
        lng: zipRow.lng,
        start_date: values.startDate,
        end_date: values.endDate,
        reg_deadline: values.regDeadline,
        reg_url: values.regUrl,
        entry_fee_cents: values.entryFeeCents,
        rated: values.rated,
        rating_system: "uschess",
        source: "organizer",
        image_url: imageUrl,
        status: "published",
        visibility: values.visibility,
        org_id: values.orgId,
        created_by: profileId,
        source_draft_id: sourceDraftId,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") {
        const publishedSlug = await findPublishedDraftSlug(
          supabase,
          sourceDraftId,
          values.orgId
        );
        if (publishedSlug) return { ok: true, slug: publishedSlug };
        continue; // Slug taken by another tournament — retry with a suffix.
      }
      return { ok: false, error: "Could not create the tournament. Try again." };
    }

    // One open section by default; eligibility splits are a later edit.
    await supabase.from("sections").insert({
      competition_id: created.id,
      name: "Open",
    });

    if (values.visibility === "public") revalidatePath("/chess");
    revalidatePath(`/orgs/${values.orgSlug}`);
    return { ok: true, slug: created.slug };
  }
  return { ok: false, error: "A tournament with that name and date already exists." };
}

const TournamentUpdateSchema = z
  .object({
    competitionId: z.string().uuid(),
    eventSlug: z.string().min(1),
    orgSlug: z.string().min(1),
    name: z.string().trim().min(3, "Name the tournament.").max(120),
    startDate: DateString,
    endDate: DateString.nullable(),
    regDeadline: DateString.nullable(),
    venueName: z.string().trim().max(120).transform((v) => v || null),
    address: z.string().trim().max(160).transform((v) => v || null),
    city: z.string().trim().min(2, "Enter the city.").max(80),
    state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Pick a state."),
    zip: z.string().trim().regex(/^\d{5}$/, "Zip must be 5 digits."),
    entryFeeCents: z.number().int().nonnegative().nullable(),
    regUrl: z
      .string()
      .trim()
      .url("Registration link must be a full URL.")
      .nullable()
      .or(z.literal("").transform(() => null)),
    visibility: z.enum(["public", "private"]),
    rated: z.boolean(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date can’t be before the start date.",
    path: ["endDate"],
  });

export type TournamentUpdateInput = z.input<typeof TournamentUpdateSchema>;

/** Edit a hosted tournament. The slug never changes — shared links stay live. */
export async function updateTournament(
  input: TournamentUpdateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = TournamentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { data: zipRow } = await supabase
    .from("zips")
    .select("lat, lng")
    .eq("zip", values.zip)
    .maybeSingle();
  if (!zipRow) {
    return { ok: false, error: "We don’t recognize that zip code — double-check it." };
  }

  const { data, error } = await supabase
    .from("competitions")
    .update({
      name: values.name,
      venue_name: values.venueName,
      address: values.address,
      city: values.city,
      state: values.state,
      zip: values.zip,
      lat: zipRow.lat,
      lng: zipRow.lng,
      start_date: values.startDate,
      end_date: values.endDate,
      reg_deadline: values.regDeadline,
      reg_url: values.regUrl,
      entry_fee_cents: values.entryFeeCents,
      rated: values.rated,
      visibility: values.visibility,
    })
    .eq("id", values.competitionId)
    .select("slug");
  if (error || !data?.length) {
    return { ok: false, error: "Could not save changes. Try again." };
  }

  revalidatePath("/chess");
  revalidatePath(`/event/${values.eventSlug}`);
  revalidatePath(`/event/${values.eventSlug}/manage`);
  revalidatePath(`/orgs/${values.orgSlug}`);
  return { ok: true, slug: values.eventSlug };
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
    return { ok: false, error: "Could not cancel the tournament." };
  }

  revalidatePath("/chess");
  revalidatePath(`/event/${input.eventSlug}`);
  revalidatePath(`/orgs/${input.orgSlug}`);
  return { ok: true };
}
