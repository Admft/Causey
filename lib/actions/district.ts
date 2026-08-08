"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { createInAppNotifications } from "@/lib/actions/notifications";
import type { OrgMemberRole } from "@/lib/auth/orgs";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  buildClaimPath,
  invitationRoleFitsOrganization,
} from "@/lib/invitations/claim-path";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const StaffRoleSchema = z.enum([
  "assistant_coach",
  "coach",
  "school_admin",
  "district_admin",
]);
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
});

const AnnouncementSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string().min(1),
  title: z.string().trim().min(2).max(100),
  body: z.string().trim().min(2).max(2000),
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
  const { data: allowed } = await supabase.rpc("is_district_admin", {
    p_district_id: parsed.data.districtId,
    p_profile_id: user.id,
  });
  if (allowed !== true) {
    return { ok: false, error: "District administrator access required." };
  }

  const base = slugifyName(parsed.data.name);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data: school, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.data.name,
        slug,
        type: "school",
        state: parsed.data.state,
        parent_org_id: parsed.data.districtId,
        created_by: user.id,
        owner_profile_id: user.id,
        verification_status: "pending",
      })
      .select("id, slug")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: "Could not create the school. Try again." };
    }

    await supabase.from("org_memberships").upsert({
      org_id: school.id,
      profile_id: user.id,
      role: "school_admin",
      status: "active",
    });
    revalidatePath(`/orgs/${parsed.data.districtSlug}`);
    revalidatePath("/orgs");
    return { ok: true, slug: school.slug };
  }
  return { ok: false, error: "That school name is already in use." };
}

export async function updateOrganizationSettings(input: {
  orgId: string;
  orgSlug: string;
  name: string;
  state: string;
}): Promise<ActionResult> {
  const parsed = OrgSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings." };
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
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      state: parsed.data.state,
    })
    .eq("id", parsed.data.orgId);
  if (error) return { ok: false, error: "Could not save organization settings." };
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
    const result = await createInvitationRecord({
      orgId: parsed.data.orgId,
      email: emailParsed.data,
      displayName,
      role: roleParsed.data,
      batchId: batch.id,
    });
    if (result.ok) {
      invited += 1;
      claims.push({
        email: emailParsed.data,
        role: roleParsed.data,
        claimPath: result.claimPath,
        expiresAt: result.expiresAt,
      });
    } else failed.push({ row: index + 1, email, error: result.error });
  }

  await supabase
    .from("provisioning_batches")
    .update({ invited_rows: invited, failed_rows: failed.length })
    .eq("id", batch.id);
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
}): Promise<ActionResult> {
  const parsed = AnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the announcement." };
  }
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Sign in to continue." };
  const supabase = await createServerSupabaseClient();
  const { data: announcement, error } = await supabase
    .from("org_announcements")
    .insert({
      org_id: parsed.data.orgId,
      title: parsed.data.title,
      body: parsed.data.body,
      created_by: profile.id,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not publish the announcement." };

  const { data: members } = await supabase
    .from("org_memberships")
    .select("profile_id")
    .eq("org_id", parsed.data.orgId)
    .eq("status", "active");
  const recipients = (members ?? [])
    .map((row) => row.profile_id as string)
    .filter((id) => id !== profile.id);
  if (recipients.length) {
    const announcementId = announcement?.id ?? parsed.data.orgId;
    await createInAppNotifications(
      recipients.map((recipientId) => ({
        recipientId,
        kind: "announcement" as const,
        title: parsed.data.title,
        body: parsed.data.body.slice(0, 240),
        href: `/orgs/${parsed.data.orgSlug}`,
        entityType: "org_announcement",
        entityId: String(announcementId),
        dedupeKey: `announcement:${announcementId}:${recipientId}`,
      }))
    );
  }

  revalidatePath(`/orgs/${parsed.data.orgSlug}`);
  revalidatePath("/me/notifications");
  return { ok: true };
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
  const { error } = await supabase
    .from("competition_entrants")
    .update({
      status: parsed.data.status,
      attendance_marked_by: user.id,
      attendance_marked_at: new Date().toISOString(),
    })
    .eq("competition_id", parsed.data.competitionId)
    .eq("profile_id", parsed.data.profileId);
  if (error) return { ok: false, error: "Could not save attendance." };
  revalidatePath(`/event/${parsed.data.eventSlug}/manage`);
  return { ok: true };
}
