"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { canCreateOrg } from "@/lib/org-permissions";
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
  });

export type TournamentCreateInput = z.input<typeof TournamentCreateSchema>;

export async function createTournament(
  input: TournamentCreateInput
): Promise<ActionResult<{ slug: string }>> {
  const parsed = TournamentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const values = parsed.data;

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  if (!canCreateOrg(profile)) {
    return { ok: false, error: "Only coach / organizer accounts can create tournaments." };
  }

  const supabase = await createServerSupabaseClient();

  // Defense-in-depth: RLS also requires coach powers on the org.
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, created_by")
    .eq("id", values.orgId)
    .maybeSingle();
  if (!org) return { ok: false, error: "Organization not found." };

  // Geo from the public zips table — radius search needs real coordinates.
  const { data: zipRow } = await supabase
    .from("zips")
    .select("lat, lng")
    .eq("zip", values.zip)
    .maybeSingle();
  if (!zipRow) {
    return {
      ok: false,
      error: "We don’t recognize that zip code — double-check it.",
    };
  }

  return insertWithSlugRetry(supabase, values, org.name, profile.id, zipRow);
}

async function insertWithSlugRetry(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  values: z.output<typeof TournamentCreateSchema>,
  orgName: string,
  profileId: string,
  zipRow: { lat: number; lng: number }
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
        status: "published",
        visibility: values.visibility,
        org_id: values.orgId,
        created_by: profileId,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue; // slug taken — retry with suffix
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
