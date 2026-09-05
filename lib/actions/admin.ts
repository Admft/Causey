"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import { inviteOrganizationMember } from "@/lib/actions/district";
import {
  getPlatformAdminUser,
  getSuperAdminUser,
} from "@/lib/auth/platform-admin";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import {
  DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE,
  organizationSupportsDistrictAudience,
} from "@/lib/competition-audience";
import {
  getTournamentZip,
  insertTournamentRecord,
  updateTournamentRecord,
} from "@/lib/data/tournament-mutations";
import {
  getAdminUsers,
  parseAdminUserAccess,
  type AdminUserDirectoryRow,
} from "@/lib/data/admin";
import { slugifyName, withSlugSuffix } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TournamentCreateSchema,
  TournamentUpdateSchema,
  type TournamentCreateInput,
  type TournamentUpdateInput,
} from "@/lib/validation/tournament";

const SUPER_ADMIN_DISTRICT_MESSAGE =
  "Creating a district is limited to founder super admins.";

function revalidatePublicDiscovery() {
  for (const category of DISCOVERY_CATEGORIES) {
    revalidatePath(category.href);
  }
}

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

const AdminDistrictProvisionSchema = z.object({
  name: z.string().trim().min(2, "Name the district.").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Pick the district's state."),
  contactEmail: z
    .string()
    .trim()
    .email("Enter the district contact's email address.")
    .max(320),
  contactName: z.string().trim().max(100).optional(),
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

const BULK_TOURNAMENT_CAP = 100;

const AdminBulkStatusSchema = z.object({
  competitionIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one tournament.")
    .max(BULK_TOURNAMENT_CAP, `Select at most ${BULK_TOURNAMENT_CAP} tournaments.`),
  status: z.enum([
    "draft",
    "pending_review",
    "published",
    "rejected",
    "archived",
  ]),
});

const AdminBulkReviewSchema = z
  .object({
    competitionIds: z
      .array(z.string().uuid())
      .min(1, "Select at least one tournament.")
      .max(
        BULK_TOURNAMENT_CAP,
        `Select at most ${BULK_TOURNAMENT_CAP} tournaments.`
      ),
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

const AdminUserAccessSchema = z.object({
  profileId: z.string().uuid(),
  accountRole: z.enum(["student", "parent", "coach"]),
  platformAdmin: z.boolean(),
});

const AdminOrgMembershipSchema = z.object({
  profileId: z.string().uuid(),
  orgSlug: z
    .string()
    .trim()
    .min(1, "Enter the organization slug.")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use the organization slug (lowercase letters, numbers, hyphens)."),
  role: z.enum([
    "student",
    "assistant_coach",
    "coach",
    "school_admin",
    "district_admin",
    "admin",
  ]),
  status: z.enum(["active", "removed"]).default("active"),
});

const AdminUserSearchSchema = z.object({
  query: z.string().trim().max(200),
  page: z.number().int().min(1).max(10_000),
  access: z.enum(["all", "admins"]).optional(),
});

const AdminOrganizationVerificationSchema = z
  .object({
    orgId: z.string().uuid(),
    orgSlug: z.string().min(1).max(120),
    status: z.enum(["pending", "verified", "rejected"]),
    note: z.string().trim().max(1000),
  })
  .superRefine((value, context) => {
    if (value.status === "rejected" && !value.note) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Explain what the organization needs to correct.",
      });
    }
  });

const AdminBulkSchoolVerificationSchema = z.object({
  districtId: z.string().uuid(),
  districtSlug: z.string().min(1).max(120),
  schoolIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one pending school.")
    .max(50, "Select at most 50 schools at a time."),
});

export async function adminSearchUsers(input: {
  query: string;
  page: number;
  access?: string;
}): Promise<
  ActionResult<{
    users: AdminUserDirectoryRow[];
    total: number;
    page: number;
  }>
> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Platform administrator access required.",
    };
  }
  const parsed = AdminUserSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the account search." };
  }

  const result = await getAdminUsers({
    query: parsed.data.query,
    limit: 50,
    offset: (parsed.data.page - 1) * 50,
    access: parseAdminUserAccess(parsed.data.access),
  });
  if (result.error) return { ok: false, error: result.error };
  return {
    ok: true,
    users: result.users,
    total: result.total,
    page: parsed.data.page,
  };
}

export async function adminUpdateUserAccess(input: {
  profileId: string;
  accountRole: string;
  platformAdmin: boolean;
}): Promise<ActionResult> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Platform administrator access required.",
    };
  }
  const parsed = AdminUserAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose valid account access." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_platform_user_access", {
    p_profile_id: parsed.data.profileId,
    p_account_role: parsed.data.accountRole,
    p_platform_admin: parsed.data.platformAdmin,
  });
  if (error) {
    if (error.message.includes("cannot_change_own_access")) {
      return {
        ok: false,
        error: "Use another platform administrator to change your own access.",
      };
    }
    if (error.message.includes("cannot_remove_last_platform_admin")) {
      return {
        ok: false,
        error: "Causey must keep at least one platform administrator.",
      };
    }
    if (error.message.includes("cannot_modify_super_admin")) {
      return {
        ok: false,
        error: "Protected founder accounts cannot be changed here.",
      };
    }
    if (error.message.includes("super_admin_required")) {
      return {
        ok: false,
        error: "Only a founder super-admin can grant or remove platform administration.",
      };
    }
    if (error.message.includes("profile_not_found")) {
      return { ok: false, error: "That account no longer exists." };
    }
    return { ok: false, error: "Could not update this account’s access." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

const AdminUserDeleteSchema = z.object({
  profileId: z.string().uuid(),
  confirmationEmail: z.string().trim().email().max(320),
});

export async function adminDeleteUser(input: {
  profileId: string;
  confirmationEmail: string;
}): Promise<ActionResult> {
  const admin = await getSuperAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Founder super-admin access required.",
    };
  }
  const parsed = AdminUserDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type the account email exactly to confirm deletion." };
  }

  const supabase = await createServerSupabaseClient();
  const directory = await getAdminUsers({
    query: parsed.data.confirmationEmail,
    limit: 20,
  });
  if (directory.error) {
    return { ok: false, error: directory.error };
  }
  const target = directory.users.find(
    (user) => user.profile_id === parsed.data.profileId
  );
  if (!target) {
    return { ok: false, error: "That account no longer exists." };
  }
  if (target.super_admin) {
    return {
      ok: false,
      error: "Protected founder accounts cannot be deleted.",
    };
  }
  if (
    target.email.trim().toLowerCase() !==
    parsed.data.confirmationEmail.trim().toLowerCase()
  ) {
    return { ok: false, error: "Type the account email exactly to confirm deletion." };
  }

  const { error } = await supabase.rpc("delete_platform_user", {
    p_profile_id: parsed.data.profileId,
  });
  if (error) {
    if (error.message.includes("super_admin_required")) {
      return { ok: false, error: "Founder super-admin access required." };
    }
    if (error.message.includes("cannot_delete_own_account")) {
      return { ok: false, error: "You cannot delete your own account here." };
    }
    if (error.message.includes("cannot_modify_super_admin")) {
      return {
        ok: false,
        error: "Protected founder accounts cannot be deleted.",
      };
    }
    if (error.message.includes("profile_not_found")) {
      return { ok: false, error: "That account no longer exists." };
    }
    return { ok: false, error: "Could not delete this account." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminUpsertOrgMembership(input: {
  profileId: string;
  orgSlug: string;
  role: string;
  status?: "active" | "removed";
}): Promise<
  ActionResult<{
    orgSlug: string;
    orgName: string;
    role: string;
    status: string;
  }>
> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Platform administrator access required.",
    };
  }
  const parsed = AdminOrgMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the membership details.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name, type")
    .eq("slug", parsed.data.orgSlug)
    .maybeSingle();
  if (!org) {
    return { ok: false, error: "No organization matches that slug." };
  }

  const { data, error } = await supabase.rpc("admin_upsert_org_membership", {
    p_profile_id: parsed.data.profileId,
    p_org_id: org.id,
    p_role: parsed.data.role,
    p_status: parsed.data.status,
  });
  if (error) {
    if (error.message.includes("district_membership_role_not_allowed")) {
      return {
        ok: false,
        error:
          "Districts cannot have student or school-admin memberships. Use a school slug or a district staff role.",
      };
    }
    if (error.message.includes("district_admin_requires_district")) {
      return {
        ok: false,
        error: "District administrator only applies to district organizations.",
      };
    }
    if (error.message.includes("profile_not_found")) {
      return { ok: false, error: "That account no longer exists." };
    }
    if (error.message.includes("organization_not_found")) {
      return { ok: false, error: "That organization no longer exists." };
    }
    console.error("Admin org membership upsert failed:", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Could not update organization membership." };
  }

  const payload = (data ?? {}) as {
    org_slug?: string;
    org_name?: string;
    role?: string;
    status?: string;
  };
  revalidatePath("/admin/users");
  revalidatePath(`/orgs/${org.slug}`);
  revalidatePath(`/orgs/${org.slug}/people`);
  revalidatePath("/orgs");
  return {
    ok: true,
    orgSlug: payload.org_slug ?? org.slug,
    orgName: payload.org_name ?? org.name,
    role: payload.role ?? parsed.data.role,
    status: payload.status ?? parsed.data.status,
  };
}

export async function adminReviewOrganization(input: {
  orgId: string;
  orgSlug: string;
  status: "pending" | "verified" | "rejected";
  note: string;
}): Promise<ActionResult<{ status: "pending" | "verified" | "rejected" }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Platform administrator access required.",
    };
  }
  const parsed = AdminOrganizationVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the organization review.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("review_organization_verification", {
    p_org_id: parsed.data.orgId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });
  if (error) {
    if (error.message.includes("organization_not_found")) {
      return { ok: false, error: "That organization no longer exists." };
    }
    console.error("Organization verification review failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      error: "Could not save this review. Try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/orgs/${parsed.data.orgSlug}`);
  revalidatePath(`/orgs/${parsed.data.orgSlug}/settings`);
  return { ok: true, status: parsed.data.status };
}

export async function adminBulkVerifyDistrictSchools(input: {
  districtId: string;
  districtSlug: string;
  schoolIds: string[];
}): Promise<ActionResult<{ verified: number }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return {
      ok: false,
      error: "Platform administrator access required.",
    };
  }
  const parsed = AdminBulkSchoolVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Check the selected district schools.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "bulk_verify_district_schools",
    {
      p_district_id: parsed.data.districtId,
      p_school_ids: parsed.data.schoolIds,
    }
  );
  if (error) {
    if (error.message.includes("verified_parent_district_required")) {
      return {
        ok: false,
        error: "Verify the parent district before verifying its schools.",
      };
    }
    if (
      error.message.includes(
        "schools_must_be_pending_children_of_one_district"
      )
    ) {
      return {
        ok: false,
        error:
          "Choose only pending schools connected to this one district.",
      };
    }
    console.error("Bulk school verification failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      error: "Could not verify these schools. Try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/orgs/${parsed.data.districtSlug}`);
  revalidatePath(`/orgs/${parsed.data.districtSlug}/reports`);
  return { ok: true, verified: Number(data ?? parsed.data.schoolIds.length) };
}

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

  if (parsed.data.type === "district" && !(await getSuperAdminUser())) {
    return { ok: false, error: SUPER_ADMIN_DISTRICT_MESSAGE };
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
        owner_profile_id: admin.id,
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

export type DistrictProvisionPack = {
  id: string;
  slug: string;
  name: string;
  invitation:
    | {
        email: string;
        claimPath: string;
        activationCode: string | null;
        expiresAt: string;
      }
    | null;
  /** Set when the district exists but its first invitation did not send. */
  invitationError?: string;
};

/**
 * One action for the whole handoff: create the district, invite its first
 * district administrator, and return the claim link and typable code together
 * so a signed contract can be turned into working access in a single step.
 */
export async function adminProvisionDistrict(input: {
  name: string;
  state: string;
  contactEmail: string;
  contactName?: string;
}): Promise<ActionResult<DistrictProvisionPack>> {
  const admin = await getSuperAdminUser();
  if (!admin) return { ok: false, error: SUPER_ADMIN_DISTRICT_MESSAGE };

  const parsed = AdminDistrictProvisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the district details.",
    };
  }

  const base = slugifyName(parsed.data.name);
  if (!base) return { ok: false, error: "Name the district." };

  const supabase = await createServerSupabaseClient();
  let district: { id: string; slug: string } | null = null;
  for (let attempt = 1; attempt <= 5 && !district; attempt += 1) {
    const slug = attempt === 1 ? base : withSlugSuffix(base, attempt);
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.data.name,
        slug,
        type: "district",
        state: parsed.data.state,
        created_by: admin.id,
        owner_profile_id: admin.id,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: "Could not create the district." };
    }
    district = data;
  }
  if (!district) return { ok: false, error: "That district name is already in use." };

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");

  const invitation = await inviteOrganizationMember({
    orgId: district.id,
    orgSlug: district.slug,
    email: parsed.data.contactEmail,
    displayName: parsed.data.contactName,
    role: "district_admin",
  });

  if (!invitation.ok) {
    return {
      ok: true,
      id: district.id,
      slug: district.slug,
      name: parsed.data.name,
      invitation: null,
      invitationError: invitation.error,
    };
  }

  return {
    ok: true,
    id: district.id,
    slug: district.slug,
    name: parsed.data.name,
    invitation: {
      email: parsed.data.contactEmail,
      claimPath: invitation.claimPath,
      activationCode: invitation.activationCode,
      expiresAt: invitation.expiresAt,
    },
  };
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

  const zipResult =
    values.participationMode === "online"
      ? ({ ok: true, lat: null, lng: null } as const)
      : await getTournamentZip(supabase, values.zip);
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
  if (values.audience === "district") {
    const { data: existing } = await supabase
      .from("competitions")
      .select("org_id, organizations!competitions_org_id_fkey(type, parent_org_id)")
      .eq("id", values.competitionId)
      .maybeSingle();
    const host = existing?.organizations as
      | { type: "school" | "club" | "team" | "district"; parent_org_id: string | null }
      | null
      | undefined;
    if (!organizationSupportsDistrictAudience(host ?? null)) {
      return { ok: false, error: DISTRICT_AUDIENCE_UNAVAILABLE_MESSAGE };
    }
  }
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

  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${values.competitionId}/edit`);
  revalidatePublicDiscovery();
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
  revalidatePublicDiscovery();
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
  revalidatePublicDiscovery();
  revalidatePath(`/event/${parsed.data.eventSlug}`);
  return { ok: true, status };
}

export async function adminBulkSetTournamentStatus(input: {
  competitionIds: string[];
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
}): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = AdminBulkStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bulk status change.",
    };
  }

  const ids = [...new Set(parsed.data.competitionIds)];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competitions")
    .update({ status: parsed.data.status })
    .in("id", ids)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the selected tournaments." };
  }

  const updated = data?.length ?? 0;
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/moderation");
  revalidatePublicDiscovery();
  return { ok: true, updated, skipped: ids.length - updated };
}

export async function adminBulkReviewTournaments(input: {
  competitionIds: string[];
  decision: "approve" | "reject";
  note?: string;
}): Promise<ActionResult<{ updated: number; skipped: number; status: "published" | "rejected" }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) return { ok: false, error: "Platform administrator access required." };

  const parsed = AdminBulkReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the review decision.",
    };
  }

  const ids = [...new Set(parsed.data.competitionIds)];
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
    .in("id", ids)
    .eq("status", "pending_review")
    .select("id");
  if (error) {
    return { ok: false, error: "Could not review the selected tournaments." };
  }

  const updated = data?.length ?? 0;
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/moderation");
  revalidatePublicDiscovery();
  return {
    ok: true,
    updated,
    skipped: ids.length - updated,
    status,
  };
}
