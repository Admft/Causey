"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { actionErrorMessage } from "@/lib/actions/errors";
import { createInAppNotifications, getActiveGuardiansForProfiles } from "@/lib/actions/in-app-notifications";
import type { OrgMemberRole } from "@/lib/auth/orgs";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  buildClaimPath,
  invitationRoleFitsOrganization,
} from "@/lib/invitations/claim-path";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  RATE_LIMIT_MESSAGE,
  consumeRateLimit,
  hashedRequestActorKey,
} from "@/lib/rate-limit";

const InvitationRoleSchema = z.enum([
  "student",
  "assistant_coach",
  "coach",
  "school_admin",
  "district_admin",
]);
const EmailSchema = z.string().trim().email().max(320);

const SchoolCreateSchema = z.object({
  districtId: z.string().uuid(),
  districtSlug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
});

const OrgSettingsSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  websiteUrl: z
    .string()
    .trim()
    .max(200)
    .refine(
      (value) => value === "" || /^https?:\/\/.+/i.test(value),
      "Website must start with http:// or https://."
    )
    .optional(),
  meetingNote: z.string().trim().max(280).optional(),
});

const AnnouncementSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string().min(1),
  title: z.string().trim().min(2).max(100),
  body: z.string().trim().min(2).max(2000),
  /** District overview only: fan out to each connected school workspace. */
  audience: z.enum(["org", "connected_schools"]).default("org"),
});

const NotificationPreferencesSchema = z.object({
  invitation: z.boolean(),
  registrationDeadline: z.boolean(),
  reminder7Day: z.boolean(),
  reminder1Day: z.boolean(),
  scheduleChange: z.boolean(),
  cancellation: z.boolean(),
  rsvpUpdate: z.boolean(),
  announcement: z.boolean(),
  result: z.boolean(),
  emailEnabled: z.boolean(),
  guardianRouting: z.boolean(),
  timezone: z.string().trim().min(1).max(100),
});

async function currentUserOrError(): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string }
> {
  const user = await getSessionUser();
  return user
    ? { ok: true, id: user.id }
    : { ok: false, error: "Sign in to continue." };
}

export async function createDistrictSchool(input: {
  districtId: string;
  districtSlug: string;
  name: string;
  state: string;
}): Promise<ActionResult<{ slug: string }>> {
  const parsed = SchoolCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the school." };
  }
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();
  const { data: allowed, error: permissionError } = await supabase.rpc(
    "is_district_admin",
    {
      p_district_id: parsed.data.districtId,
      p_profile_id: user.id,
    }
  );
  if (permissionError) {
    return {
      ok: false,
      error: actionErrorMessage(
        permissionError,
        "Could not verify district administrator access."
      ),
    };
  }
  if (allowed !== true) {
    return { ok: false, error: "District administrator access required." };
  }

  const base = slugifyName(parsed.data.name);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data, error } = await supabase.rpc("create_district_school", {
      p_district_id: parsed.data.districtId,
      p_name: parsed.data.name,
      p_slug: slug,
      p_state: parsed.data.state,
    });
    if (error) {
      if (error.code === "23505") continue;
      if (
        error.code === "42501" ||
        error.message.includes("district_admin_required")
      ) {
        return {
          ok: false,
          error: "District administrator access required.",
        };
      }
      return {
        ok: false,
        error: actionErrorMessage(
          error,
          "Could not create the school. Try again."
        ),
      };
    }

    const school = data?.[0] as { school_slug?: string } | undefined;
    if (!school?.school_slug) {
      return {
        ok: false,
        error: "Could not confirm the new school. Refresh before retrying.",
      };
    }
    revalidatePath(`/orgs/${parsed.data.districtSlug}`);
    revalidatePath("/orgs");
    return { ok: true, slug: school.school_slug };
  }
  return { ok: false, error: "That school name is already in use." };
}

export async function updateOrganizationSettings(input: {
  orgId: string;
  orgSlug: string;
  name: string;
  state: string;
  websiteUrl?: string;
  meetingNote?: string;
}): Promise<ActionResult> {
  const parsed = OrgSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings." };
  }
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();
  const { data: allowed, error: permissionError } = await supabase.rpc(
    "can_administer_org",
    {
      p_org_id: parsed.data.orgId,
      p_profile_id: user.id,
    }
  );
  if (permissionError) {
    return {
      ok: false,
      error: actionErrorMessage(
        permissionError,
        "Could not verify organization administrator access."
      ),
    };
  }
  if (allowed !== true) {
    return { ok: false, error: "Organization administrator access required." };
  }
  const { count, error } = await supabase
    .from("organizations")
    .update(
      {
        name: parsed.data.name,
        state: parsed.data.state,
        ...(parsed.data.websiteUrl !== undefined
          ? {
              website_url: parsed.data.websiteUrl
                ? parsed.data.websiteUrl
                : null,
            }
          : {}),
        ...(parsed.data.meetingNote !== undefined
          ? {
              meeting_note: parsed.data.meetingNote
                ? parsed.data.meetingNote
                : null,
            }
          : {}),
      },
      { count: "exact" }
    )
    .eq("id", parsed.data.orgId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "The organization was not found or its settings could not be saved.",
        "You don’t have permission to change these organization settings."
      ),
    };
  }
  revalidatePath(`/orgs/${parsed.data.orgSlug}`);
  revalidatePath(`/orgs/${parsed.data.orgSlug}/settings`);
  revalidatePath("/orgs");
  return { ok: true };
}

export async function transferOrganizationOwnership(input: {
  orgId: string;
  orgSlug: string;
  nextOwnerProfileId: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      orgId: z.string().uuid(),
      orgSlug: z.string().min(1),
      nextOwnerProfileId: z.string().uuid(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose an active staff member." };
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();

  const [{ data: org }, { data: nextOwner }] = await Promise.all([
    supabase
      .from("organizations")
      .select("owner_profile_id")
      .eq("id", parsed.data.orgId)
      .maybeSingle(),
    supabase
      .from("org_memberships")
      .select("profile_id, role, status")
      .eq("org_id", parsed.data.orgId)
      .eq("profile_id", parsed.data.nextOwnerProfileId)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (!org || org.owner_profile_id !== user.id) {
    return { ok: false, error: "Only the current owner can transfer ownership." };
  }
  if (
    !nextOwner ||
    !["coach", "school_admin", "district_admin"].includes(nextOwner.role)
  ) {
    return { ok: false, error: "Transfer ownership to an active administrator." };
  }

  const { data: transferred, error } = await supabase
    .from("organizations")
    .update({ owner_profile_id: parsed.data.nextOwnerProfileId })
    .eq("id", parsed.data.orgId)
    .eq("owner_profile_id", org.owner_profile_id)
    .select("id")
    .maybeSingle();
  if (error || !transferred) {
    return {
      ok: false,
      error: "Ownership changed before this request. Refresh and try again.",
    };
  }
  revalidatePath(`/orgs/${parsed.data.orgSlug}/settings`);
  return { ok: true };
}

type InvitationResult = {
  invitationId: string;
  claimPath: string;
  expiresAt: string;
};

async function createInvitationRecord(input: {
  orgId: string;
  email: string;
  role: OrgMemberRole;
  displayName?: string;
  batchId?: string;
}): Promise<ActionResult<InvitationResult>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_org_invitation", {
    p_org_id: input.orgId,
    p_email: input.email,
    p_role: input.role,
    p_display_name: input.displayName || null,
    p_batch_id: input.batchId || null,
  });
  const row = data?.[0] as
    | {
        invitation_id: string;
        claim_token: string;
        expires_at: string;
      }
    | undefined;
  if (error || !row) {
    return { ok: false, error: "Could not create this invitation." };
  }
  return {
    ok: true,
    invitationId: row.invitation_id,
    claimPath: buildClaimPath(row.claim_token),
    expiresAt: row.expires_at,
  };
}

async function getOrganizationType(orgId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .maybeSingle();
  return data?.type ?? null;
}

export async function inviteOrganizationMember(input: {
  orgId: string;
  orgSlug: string;
  email: string;
  displayName?: string;
  role: string;
}): Promise<ActionResult<InvitationResult>> {
  const parsed = z
    .object({
      orgId: z.string().uuid(),
      orgSlug: z.string().min(1),
      email: EmailSchema,
      displayName: z.string().trim().max(100).optional(),
      role: InvitationRoleSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the invitation." };
  }
  const orgType = await getOrganizationType(parsed.data.orgId);
  if (!orgType) {
    return { ok: false, error: "Could not identify this organization." };
  }
  if (!invitationRoleFitsOrganization(orgType, parsed.data.role)) {
    return {
      ok: false,
      error:
        orgType === "district"
          ? "Invite district staff here. Students and school administrators belong in a school workspace."
          : "District administrators can only be invited to a district workspace.",
    };
  }
  const result = await createInvitationRecord(parsed.data);
  if (result.ok) {
    revalidatePath(`/orgs/${parsed.data.orgSlug}/people`);
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export type BulkInviteClaimRow = {
  email: string;
  role: OrgMemberRole;
  claimPath: string;
  expiresAt: string;
};

export async function bulkInviteOrganizationMembers(input: {
  orgId: string;
  orgSlug: string;
  csv: string;
  filename?: string;
}): Promise<
  ActionResult<{
    invited: number;
    failed: { row: number; email: string; error: string }[];
    claims: BulkInviteClaimRow[];
  }>
> {
  const parsed = z
    .object({
      orgId: z.string().uuid(),
      orgSlug: z.string().min(1),
      csv: z.string().min(1).max(500_000),
      filename: z.string().max(255).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a valid CSV file." };
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const allowed = await consumeRateLimit(
    "csv_import",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const orgType = await getOrganizationType(parsed.data.orgId);
  if (!orgType) {
    return { ok: false, error: "Could not identify this organization." };
  }

  const lines = parsed.data.csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: "The CSV needs a header and at least one person." };
  }
  if (lines.length > 501) {
    return { ok: false, error: "Import up to 500 people at a time." };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.findIndex((header) =>
    ["name", "display_name", "display name"].includes(header)
  );
  const roleIndex = headers.indexOf("role");
  if (emailIndex < 0) {
    return { ok: false, error: "Add an email column to the CSV." };
  }
  if (orgType === "district" && roleIndex < 0) {
    return {
      ok: false,
      error:
        "District imports require a role column. Students and school administrators belong in school workspaces.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: batch, error: batchError } = await supabase
    .from("provisioning_batches")
    .insert({
      org_id: parsed.data.orgId,
      created_by: user.id,
      filename: parsed.data.filename ?? null,
      total_rows: lines.length - 1,
    })
    .select("id")
    .single();
  if (batchError || !batch) {
    return { ok: false, error: "Could not start the import." };
  }

  let invited = 0;
  const failed: { row: number; email: string; error: string }[] = [];
  const claims: BulkInviteClaimRow[] = [];
  const pending: {
    row: number;
    email: string;
    displayName: string;
    role: z.infer<typeof InvitationRoleSchema>;
  }[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const email = values[emailIndex] ?? "";
    const displayName = nameIndex >= 0 ? values[nameIndex] : "";
    const rawRole = roleIndex >= 0 ? values[roleIndex] : "student";
    const emailParsed = EmailSchema.safeParse(email);
    const roleParsed = InvitationRoleSchema.safeParse(rawRole || "student");
    if (
      !emailParsed.success ||
      !roleParsed.success ||
      (roleParsed.success &&
        !invitationRoleFitsOrganization(orgType, roleParsed.data))
    ) {
      failed.push({
        row: index + 1,
        email,
        error: !emailParsed.success
          ? "Invalid email"
          : orgType === "district"
            ? "Use a district staff role"
            : "Invalid role",
      });
      continue;
    }
    pending.push({
      row: index + 1,
      email: emailParsed.data,
      displayName,
      role: roleParsed.data,
    });
  }

  const INVITE_CONCURRENCY = 20;
  for (let start = 0; start < pending.length; start += INVITE_CONCURRENCY) {
    const chunk = pending.slice(start, start + INVITE_CONCURRENCY);
    const outcomes = await Promise.all(
      chunk.map(async (row) => {
        const result = await createInvitationRecord({
          orgId: parsed.data.orgId,
          email: row.email,
          displayName: row.displayName,
          role: row.role,
          batchId: batch.id,
        });
        return { row, result };
      })
    );
    for (const outcome of outcomes) {
      if (outcome.result.ok) {
        invited += 1;
        claims.push({
          email: outcome.row.email,
          role: outcome.row.role,
          claimPath: outcome.result.claimPath,
          expiresAt: outcome.result.expiresAt,
        });
      } else {
        failed.push({
          row: outcome.row.row,
          email: outcome.row.email,
          error: outcome.result.error,
        });
      }
    }
  }

  const { count: batchUpdateCount, error: batchUpdateError } = await supabase
    .from("provisioning_batches")
    .update(
      { invited_rows: invited, failed_rows: failed.length },
      { count: "exact" }
    )
    .eq("id", batch.id);
  if (batchUpdateError || batchUpdateCount !== 1) {
    revalidatePath(`/orgs/${parsed.data.orgSlug}/people`);
    return {
      ok: false,
      error: `${invited} ${
        invited === 1 ? "invitation was" : "invitations were"
      } created, but the import summary could not be saved. Contact support before retrying.`,
    };
  }
  revalidatePath(`/orgs/${parsed.data.orgSlug}/people`);
  return { ok: true, invited, failed, claims };
}

export async function reissueOrganizationInvitation(input: {
  orgId: string;
  orgSlug: string;
  invitationId: string;
}): Promise<ActionResult<InvitationResult & { email: string }>> {
  const parsed = z
    .object({
      orgId: z.string().uuid(),
      orgSlug: z.string().min(1),
      invitationId: z.string().uuid(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a pending invitation to reissue." };
  }
  const user = await currentUserOrError();
  if (!user.ok) return user;

  const supabase = await createServerSupabaseClient();
  const { data: allowed } = await supabase.rpc("can_administer_org", {
    p_org_id: parsed.data.orgId,
    p_profile_id: user.id,
  });
  if (allowed !== true) {
    return { ok: false, error: "Organization administrator access required." };
  }

  const { data: invitation } = await supabase
    .from("org_invitations")
    .select("id, org_id, email, display_name, role, status, expires_at")
    .eq("id", parsed.data.invitationId)
    .eq("org_id", parsed.data.orgId)
    .maybeSingle();
  if (!invitation) {
    return { ok: false, error: "That invitation could not be found." };
  }
  if (invitation.status === "claimed") {
    return {
      ok: false,
      error: "This invitation was already claimed. Create a new one instead.",
    };
  }
  if (
    invitation.status !== "pending" &&
    invitation.status !== "revoked" &&
    invitation.status !== "expired"
  ) {
    return { ok: false, error: "Only open invitations can be reissued." };
  }

  const orgType = await getOrganizationType(parsed.data.orgId);
  if (!orgType) {
    return { ok: false, error: "Could not identify this organization." };
  }
  if (!invitationRoleFitsOrganization(orgType, invitation.role)) {
    return {
      ok: false,
      error:
        orgType === "district"
          ? "Invite district staff here. Students and school administrators belong in a school workspace."
          : "District administrators can only be invited to a district workspace.",
    };
  }

  const result = await createInvitationRecord({
    orgId: parsed.data.orgId,
    email: invitation.email,
    displayName: invitation.display_name ?? undefined,
    role: invitation.role as OrgMemberRole,
  });
  if (!result.ok) return result;
  revalidatePath(`/orgs/${parsed.data.orgSlug}/people`);
  return { ...result, email: invitation.email };
}

export async function claimOrganizationInvitation(
  token: string
): Promise<ActionResult<{ slug: string; name: string }>> {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return { ok: false, error: "This invitation link is invalid or expired." };
  }
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const allowed = await consumeRateLimit(
    "claim",
    await hashedRequestActorKey(user.id)
  );
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("claim_org_invitation", {
    p_token: token,
  });
  const row = data?.[0] as
    | { org_slug: string; org_name: string }
    | undefined;
  if (error || !row) {
    return { ok: false, error: "This invitation is invalid, expired, or belongs to another email." };
  }
  revalidatePath("/orgs");
  return { ok: true, slug: row.org_slug, name: row.org_name };
}

export async function publishOrganizationAnnouncement(input: {
  orgId: string;
  orgSlug: string;
  title: string;
  body: string;
  audience?: "org" | "connected_schools";
}): Promise<ActionResult<{ schoolCount?: number }>> {
  const parsed = AnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the announcement." };
  }
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  const supabase = await createServerSupabaseClient();

  async function assertCanOperate(orgId: string): Promise<ActionResult> {
    const { data: canOperate, error: permissionError } = await supabase.rpc(
      "can_operate_org_competitions",
      {
        p_org_id: orgId,
        p_profile_id: profile!.id,
      }
    );
    if (permissionError) {
      return {
        ok: false,
        error: actionErrorMessage(
          permissionError,
          "Could not verify announcement access."
        ),
      };
    }
    if (canOperate !== true) {
      return {
        ok: false,
        error:
          "Only a coach or organization administrator can publish announcements.",
      };
    }
    return { ok: true };
  }

  const operatorCheck = await assertCanOperate(parsed.data.orgId);
  if (!operatorCheck.ok) return operatorCheck;

  type PublishTarget = { id: string; slug: string };
  const targets: PublishTarget[] = [
    { id: parsed.data.orgId, slug: parsed.data.orgSlug },
  ];
  let schoolCount = 0;

  if (parsed.data.audience === "connected_schools") {
    const { data: host, error: hostError } = await supabase
      .from("organizations")
      .select("id, type")
      .eq("id", parsed.data.orgId)
      .maybeSingle();
    if (hostError || !host) {
      return {
        ok: false,
        error: "Could not verify this district before publishing.",
      };
    }
    if (host.type !== "district") {
      return {
        ok: false,
        error: "Connected-school announcements are only available on a district workspace.",
      };
    }

    const { data: schools, error: schoolsError } = await supabase
      .from("organizations")
      .select("id, slug")
      .eq("parent_org_id", parsed.data.orgId)
      .eq("type", "school")
      .order("name");
    if (schoolsError) {
      return {
        ok: false,
        error: "Could not load connected schools. Try again.",
      };
    }
    const childSchools = (schools ?? []) as PublishTarget[];
    if (!childSchools.length) {
      return {
        ok: false,
        error: "Add a school, then publish to connected schools.",
      };
    }

    for (const school of childSchools) {
      const schoolCheck = await assertCanOperate(school.id);
      if (!schoolCheck.ok) {
        return {
          ok: false,
          error:
            "You don’t have permission to publish announcements for every connected school.",
        };
      }
    }

    // District office keeps a copy; each school workspace gets the same note
    // so members and linked parents see it without opening the district page.
    targets.push(...childSchools);
    schoolCount = childSchools.length;
  }

  const published: { id: string; orgId: string; slug: string }[] = [];
  for (const target of targets) {
    const { data: announcement, error } = await supabase
      .from("org_announcements")
      .insert({
        org_id: target.id,
        title: parsed.data.title,
        body: parsed.data.body,
        created_by: profile.id,
      })
      .select("id")
      .maybeSingle();
    if (error || !announcement?.id) {
      for (const slug of [
        parsed.data.orgSlug,
        ...published.map((row) => row.slug),
      ]) {
        revalidatePath(`/orgs/${slug}`);
      }
      return {
        ok: false,
        error: actionErrorMessage(
          error,
          published.length
            ? "Part of the announcement published, but at least one school copy failed. Check each school overview and try again."
            : "Could not publish the announcement. Try again.",
          "You don’t have permission to publish announcements for this organization."
        ),
      };
    }
    published.push({
      id: String(announcement.id),
      orgId: target.id,
      slug: target.slug,
    });
  }

  const notificationInputs: {
    recipientId: string;
    kind: "announcement";
    title: string;
    body: string;
    href: string;
    entityType: string;
    entityId: string;
    dedupeKey: string;
  }[] = [];
  const seenRecipients = new Set<string>();

  for (const row of published) {
    const { data: members, error: membersError } = await supabase
      .from("org_memberships")
      .select("profile_id")
      .eq("org_id", row.orgId)
      .eq("status", "active");
    if (membersError) {
      for (const item of published) {
        revalidatePath(`/orgs/${item.slug}`);
      }
      revalidatePath("/me/notifications");
      return {
        ok: false,
        error:
          "The announcement was published, but recipients could not be loaded for in-app updates.",
      };
    }
    for (const member of members ?? []) {
      const recipientId = member.profile_id as string;
      if (!recipientId || recipientId === profile.id) continue;
      if (seenRecipients.has(recipientId)) continue;
      seenRecipients.add(recipientId);
      notificationInputs.push({
        recipientId,
        kind: "announcement",
        title: parsed.data.title,
        body: parsed.data.body.slice(0, 240),
        href: `/orgs/${row.slug}`,
        entityType: "org_announcement",
        entityId: row.id,
        dedupeKey: `announcement:${row.id}:${recipientId}`,
      });
    }
    const studentIds = (members ?? [])
      .map((member) => member.profile_id as string)
      .filter(Boolean);
    const guardians = await getActiveGuardiansForProfiles(studentIds);
    if (guardians.error) {
      for (const item of published) {
        revalidatePath(`/orgs/${item.slug}`);
      }
      revalidatePath("/me/notifications");
      return {
        ok: false,
        error:
          "The announcement was published, but linked parents could not be notified.",
      };
    }
    for (const guardian of guardians.guardians) {
      if (!guardian.parentId || guardian.parentId === profile.id) continue;
      if (seenRecipients.has(guardian.parentId)) continue;
      seenRecipients.add(guardian.parentId);
      notificationInputs.push({
        recipientId: guardian.parentId,
        kind: "announcement",
        title: parsed.data.title,
        body: parsed.data.body.slice(0, 240),
        href: "/family",
        entityType: "org_announcement",
        entityId: row.id,
        dedupeKey: `announcement:${row.id}:parent:${guardian.parentId}`,
      });
    }
  }

  if (notificationInputs.length) {
    const notifications = await createInAppNotifications(notificationInputs);
    if (notifications.failures.length) {
      for (const item of published) {
        revalidatePath(`/orgs/${item.slug}`);
      }
      revalidatePath("/me/notifications");
      return {
        ok: false,
        error: `The announcement was published, but ${notifications.failures.length} ${
          notifications.failures.length === 1
            ? "recipient update could"
            : "recipient updates could"
        } not be created.`,
      };
    }
  }

  for (const item of published) {
    revalidatePath(`/orgs/${item.slug}`);
  }
  revalidatePath("/me/notifications");
  return schoolCount
    ? { ok: true, schoolCount }
    : { ok: true };
}

export async function saveNotificationPreferences(
  input: z.input<typeof NotificationPreferencesSchema>
): Promise<ActionResult> {
  const parsed = NotificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your notification choices." };
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    profile_id: user.id,
    invitation: parsed.data.invitation,
    registration_deadline: parsed.data.registrationDeadline,
    reminder_7_day: parsed.data.reminder7Day,
    reminder_1_day: parsed.data.reminder1Day,
    schedule_change: parsed.data.scheduleChange,
    cancellation: parsed.data.cancellation,
    rsvp_update: parsed.data.rsvpUpdate,
    announcement: parsed.data.announcement,
    result: parsed.data.result,
    email_enabled: parsed.data.emailEnabled,
    guardian_routing: parsed.data.guardianRouting,
    timezone: parsed.data.timezone,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Could not save notification preferences." };
  revalidatePath("/me/notifications");
  revalidatePath("/account");
  return { ok: true };
}

export async function markEntrantAttendance(input: {
  competitionId: string;
  profileId: string;
  eventSlug: string;
  status: "attended" | "did_not_attend";
}): Promise<ActionResult> {
  const parsed = z
    .object({
      competitionId: z.string().uuid(),
      profileId: z.string().uuid(),
      eventSlug: z.string().min(1),
      status: z.enum(["attended", "did_not_attend"]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a valid attendance status." };
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();
  const [managementCheck, entrantCheck] = await Promise.all([
    supabase.rpc("can_manage_competition", {
      p_competition_id: parsed.data.competitionId,
      p_profile_id: user.id,
    }),
    supabase.rpc("can_invite_to_competition", {
      p_competition_id: parsed.data.competitionId,
      p_entrant_id: parsed.data.profileId,
      p_inviter_id: user.id,
    }),
  ]);
  const canManage = managementCheck.data === true || entrantCheck.data === true;
  if (!canManage && managementCheck.error && entrantCheck.error) {
    return {
      ok: false,
      error: actionErrorMessage(
        managementCheck.error,
        "Could not verify attendance management access."
      ),
    };
  }
  if (!canManage) {
    return {
      ok: false,
      error: "Only competition staff can record attendance.",
    };
  }

  const { count, error } = await supabase
    .from("competition_entrants")
    .update(
      {
        status: parsed.data.status,
        attendance_marked_by: user.id,
        attendance_marked_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("competition_id", parsed.data.competitionId)
    .eq("profile_id", parsed.data.profileId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That entrant was not found or attendance could not be saved.",
        "You don’t have permission to record attendance for this entrant."
      ),
    };
  }
  revalidatePath(`/event/${parsed.data.eventSlug}/manage`);
  return { ok: true };
}

export async function recordEntrantResult(input: {
  competitionId: string;
  profileId: string;
  eventSlug: string;
  sectionId: string | null;
  placement: number | null;
  awardLabel: string | null;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      competitionId: z.string().uuid(),
      profileId: z.string().uuid(),
      eventSlug: z.string().min(1),
      sectionId: z.string().uuid().nullable(),
      placement: z.number().int().min(1).max(999).nullable(),
      awardLabel: z.string().trim().max(80).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the division, place, or award." };
  }
  const user = await currentUserOrError();
  if (!user.ok) return user;
  const supabase = await createServerSupabaseClient();
  const [managementCheck, entrantCheck] = await Promise.all([
    supabase.rpc("can_manage_competition", {
      p_competition_id: parsed.data.competitionId,
      p_profile_id: user.id,
    }),
    supabase.rpc("can_invite_to_competition", {
      p_competition_id: parsed.data.competitionId,
      p_entrant_id: parsed.data.profileId,
      p_inviter_id: user.id,
    }),
  ]);
  const canManage = managementCheck.data === true || entrantCheck.data === true;
  if (!canManage && managementCheck.error && entrantCheck.error) {
    return {
      ok: false,
      error: actionErrorMessage(
        managementCheck.error,
        "Could not verify result recording access."
      ),
    };
  }
  if (!canManage) {
    return {
      ok: false,
      error: "Only competition staff can record a result.",
    };
  }

  const award =
    parsed.data.awardLabel && parsed.data.awardLabel.length
      ? parsed.data.awardLabel
      : null;
  const hasPayload =
    parsed.data.sectionId !== null ||
    parsed.data.placement !== null ||
    award !== null;
  const { count, error } = await supabase
    .from("competition_entrants")
    .update(
      {
        section_id: parsed.data.sectionId,
        placement: parsed.data.placement,
        award_label: award,
        result_marked_by: hasPayload ? user.id : null,
        result_marked_at: hasPayload ? new Date().toISOString() : null,
      },
      { count: "exact" }
    )
    .eq("competition_id", parsed.data.competitionId)
    .eq("profile_id", parsed.data.profileId);
  if (error || count !== 1) {
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "That result could not be saved.",
        "You don’t have permission to record a result for this student."
      ),
    };
  }

  if (hasPayload) {
    const { data: competition } = await supabase
      .from("competitions")
      .select("name")
      .eq("id", parsed.data.competitionId)
      .maybeSingle();
    const eventName = competition?.name ?? "a tournament";
    const resultBits = [
      parsed.data.placement != null ? `Place ${parsed.data.placement}` : null,
      award,
    ].filter(Boolean);
    const resultBody = resultBits.length
      ? `${resultBits.join(" · ")} is now on Causey.`
      : "A division was recorded on Causey.";
    const studentNote =
      parsed.data.profileId === user.id
        ? []
        : [
            {
              recipientId: parsed.data.profileId,
              kind: "result" as const,
              title: `Result recorded: ${eventName}`,
              body: resultBody,
              href: `/event/${parsed.data.eventSlug}`,
              entityType: "competition",
              entityId: parsed.data.competitionId,
              dedupeKey: `result:${parsed.data.competitionId}:${parsed.data.profileId}`,
            },
          ];
    const guardians = await getActiveGuardiansForProfiles([
      parsed.data.profileId,
    ]);
    if (guardians.error) {
      revalidatePath(`/event/${parsed.data.eventSlug}/manage`);
      revalidatePath("/me");
      revalidatePath("/family");
      return {
        ok: false,
        error:
          "The result was saved, but linked parents could not be notified.",
      };
    }
    const parentNotes = guardians.guardians
      .filter((guardian) => guardian.parentId !== user.id)
      .map((guardian) => ({
        recipientId: guardian.parentId,
        kind: "result" as const,
        title: `${guardian.childDisplayName} · Result recorded: ${eventName}`,
        body: resultBody,
        href: "/family",
        entityType: "competition",
        entityId: parsed.data.competitionId,
        dedupeKey: `result:${parsed.data.competitionId}:${parsed.data.profileId}:parent:${guardian.parentId}`,
      }));
    const notifications = await createInAppNotifications([
      ...studentNote,
      ...parentNotes,
    ]);
    if (notifications.failures.length) {
      revalidatePath(`/event/${parsed.data.eventSlug}/manage`);
      revalidatePath("/me");
      revalidatePath("/family");
      return {
        ok: false,
        error: `The result was saved, but ${notifications.failures.length} in-app ${
          notifications.failures.length === 1 ? "update" : "updates"
        } could not be created.`,
      };
    }
  }

  revalidatePath(`/event/${parsed.data.eventSlug}/manage`);
  revalidatePath("/me");
  revalidatePath("/family");
  return { ok: true };
}
