import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getTournamentZip: vi.fn(),
  insertTournamentRecord: vi.fn(),
  updateTournamentRecord: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/lib/data/tournament-mutations", () => ({
  getTournamentZip: mocks.getTournamentZip,
  insertTournamentRecord: mocks.insertTournamentRecord,
  updateTournamentRecord: mocks.updateTournamentRecord,
}));

const coach = { id: "coach-1", role: "coach", role_unlocked: true };

const validTournament = {
  orgId: "11111111-1111-1111-1111-111111111111",
  orgSlug: "probe-school",
  name: "Spring Scholastic Open",
  startDate: "2027-03-01",
  endDate: null,
  regDeadline: null,
  venueName: "",
  address: "",
  city: "Dallas",
  state: "TX",
  zip: "75201",
  entryFeeCents: 2500,
  regUrl: null,
  visibility: "public" as const,
  rated: true,
};

describe("SEC-06: organizer events are created as drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue(coach);
    mocks.getTournamentZip.mockResolvedValue({ ok: true, lat: 32.77, lng: -96.79 });
    mocks.insertTournamentRecord.mockResolvedValue({ ok: true, slug: "spring-open" });
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: async (name: string) => ({
        data: name === "is_org_coach",
        error: null,
      }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: validTournament.orgId, name: "Probe School", created_by: coach.id },
            }),
          }),
        }),
      }),
    });
  });

  it("writes status draft, never published", async () => {
    const { createTournament } = await import("@/lib/actions/tournaments");
    const result = await createTournament(validTournament);

    expect(result.ok).toBe(true);
    expect(mocks.insertTournamentRecord).toHaveBeenCalledTimes(1);
    expect(mocks.insertTournamentRecord.mock.calls[0][0].status).toBe("draft");
  });

  it("does not revalidate public search, because nothing became public", async () => {
    const { createTournament } = await import("@/lib/actions/tournaments");
    await createTournament(validTournament);

    const paths = mocks.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).not.toContain("/chess");
    expect(paths).toContain(`/orgs/${validTournament.orgSlug}`);
  });
});

describe("publishTournament", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue(coach);
  });

  function supabaseReturning(
    updatedStatus: "published" | "pending_review" | null
  ) {
    const statusFilter = vi.fn();
    return {
      statusFilter,
      client: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { organizations: { slug: "probe-school" } } }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: (column: string, value: string) => {
                statusFilter(column, value);
                return {
                  select: () => ({
                    maybeSingle: async () => ({
                      data: updatedStatus ? { status: updatedStatus } : null,
                      error: null,
                    }),
                  }),
                };
              },
            }),
          }),
        }),
      },
    };
  }

  it("only publishes rows still in draft", async () => {
    const { statusFilter, client } = supabaseReturning("published");
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    const { publishTournament } = await import("@/lib/actions/tournaments");
    const result = await publishTournament({
      competitionId: "22222222-2222-2222-2222-222222222222",
      eventSlug: "spring-open",
    });

    expect(result).toEqual({ ok: true, status: "published" });
    expect(statusFilter).toHaveBeenCalledWith("status", "draft");
    expect(mocks.revalidatePath.mock.calls.map((c) => c[0])).toContain("/chess");
  });

  it("reports when a public organizer listing entered review", async () => {
    const { client } = supabaseReturning("pending_review");
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    const { publishTournament } = await import("@/lib/actions/tournaments");
    await expect(
      publishTournament({
        competitionId: "22222222-2222-2222-2222-222222222222",
        eventSlug: "spring-open",
      })
    ).resolves.toEqual({ ok: true, status: "pending_review" });
  });

  it("reports failure when nothing was published", async () => {
    const { client } = supabaseReturning(null);
    mocks.createServerSupabaseClient.mockResolvedValue(client);

    const { publishTournament } = await import("@/lib/actions/tournaments");
    await expect(
      publishTournament({
        competitionId: "22222222-2222-2222-2222-222222222222",
        eventSlug: "spring-open",
      })
    ).resolves.toEqual({ ok: false, error: "Could not publish this tournament." });
  });

  it("requires a signed-in account", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    const { publishTournament } = await import("@/lib/actions/tournaments");

    await expect(
      publishTournament({ competitionId: "x", eventSlug: "y" })
    ).resolves.toEqual({ ok: false, error: "Sign in to continue." });
  });
});

describe("returned tournament resubmission", () => {
  it("saves corrections and reports the new review status", async () => {
    vi.clearAllMocks();
    mocks.getTournamentZip.mockResolvedValue({
      ok: true,
      lat: 32.77,
      lng: -96.79,
    });
    mocks.updateTournamentRecord.mockResolvedValue({
      ok: true,
      slug: "spring-open",
    });
    const resubmissionPayload = vi.fn();
    mocks.createServerSupabaseClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { status: "rejected" },
              error: null,
            }),
          }),
        }),
        update: (payload: unknown) => {
          resubmissionPayload(payload);
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { status: "pending_review" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        },
      }),
    });

    const { updateTournament } = await import("@/lib/actions/tournaments");
    const result = await updateTournament({
      ...validTournament,
      competitionId: "22222222-2222-2222-2222-222222222222",
      eventSlug: "spring-open",
      orgSlug: "probe-school",
    });

    expect(result).toEqual({
      ok: true,
      slug: "spring-open",
      status: "pending_review",
    });
    expect(resubmissionPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        reviewed_at: null,
        reviewed_by: null,
      })
    );
  });
});

describe("0016 escalation lockdown migration", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0016_escalation_lockdown.sql"),
    "utf8"
  );

  it("freezes role columns with a trigger, not only grants", () => {
    expect(sql).toContain("guard_profile_privileged_columns");
    expect(sql).toContain("new.role is distinct from old.role");
    expect(sql).toContain("new.role_unlocked is distinct from old.role_unlocked");
    expect(sql).toContain("before update on public.profiles");
  });

  it("does not restore an elevated role on join-code rejoin", () => {
    expect(sql).toMatch(/when m\.status = 'removed' then 'student'/);
    // The OUT parameter clashes with the conflict target without this.
    expect(sql).toContain("#variable_conflict use_column");
  });

  it("lets organizers see their own unpublished events and nobody else", () => {
    expect(sql).toContain("competitions_select_unpublished_manager");
    expect(sql).toContain("sections_select_unpublished_manager");
    expect(sql).toMatch(/status <> 'published'/);
    expect(sql).toContain("is_org_coach(org_id, auth.uid())");
  });

  it("keeps both audit tables append-only and unreadable to users", () => {
    expect(sql).toContain("create table if not exists public.audit_events");
    expect(sql).toContain("revoke all on public.audit_events from anon, authenticated");
    expect(sql).toContain("before update or delete on public.audit_events");
    expect(sql).toContain("before update or delete on public.admin_audit_log");
  });

  it("does not duplicate the profile grants 0015 already applied", () => {
    expect(sql).not.toMatch(/grant update \([\s\S]*?\) on public\.profiles/);
  });
});
