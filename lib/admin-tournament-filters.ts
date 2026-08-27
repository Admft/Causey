import { COMPETITION_AUDIENCE_OPTIONS } from "@/lib/auth/orgs";
import { COMPETITION_TYPES } from "@/lib/competition-types";
import type { TimingFilter } from "@/lib/competition-timing";
import {
  CompetitionAudienceSchema,
  CompetitionCategorySchema,
  ParticipationModeSchema,
  type CompetitionAudience,
  type CompetitionCategory,
  type ParticipationMode,
} from "@/lib/schemas";

const ADMIN_TOURNAMENT_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
] as const;

export type AdminTournamentStatus = (typeof ADMIN_TOURNAMENT_STATUSES)[number];

export type AdminTournamentListFilters = {
  status?: AdminTournamentStatus;
  source?: string;
  /** true = publish-ready only; false = not ready (needs details). */
  ready?: boolean;
  category?: CompetitionCategory;
  timing?: TimingFilter;
  q?: string;
  state?: string;
  mode?: ParticipationMode;
  audience?: CompetitionAudience;
};

export type AdminTournamentQueue =
  | "review"
  | "ready"
  | "needs_details"
  | "drafts"
  | "published"
  | "archived"
  | "rejected"
  | "all";

export type AdminTournamentWorkState =
  | "review"
  | "ready"
  | "needs_details"
  | "published"
  | "archived"
  | "rejected";

export const ADMIN_TOURNAMENT_WORK_ORDER: readonly AdminTournamentWorkState[] = [
  "review",
  "ready",
  "needs_details",
  "published",
  "archived",
  "rejected",
];

export const ADMIN_TOURNAMENT_QUEUE_LABEL: Record<
  AdminTournamentQueue,
  string
> = {
  review: "Needs review",
  ready: "Ready to publish",
  needs_details: "Needs details",
  drafts: "Drafts",
  published: "Published",
  archived: "Archived",
  rejected: "Rejected",
  all: "Records",
};

export const ADMIN_TOURNAMENT_WORK_LABEL: Record<
  AdminTournamentWorkState,
  string
> = {
  review: "Needs review",
  ready: "Ready to publish",
  needs_details: "Needs details",
  published: "Published",
  archived: "Archived",
  rejected: "Rejected",
};

export function adminTournamentWorkState(row: {
  status: AdminTournamentStatus;
  publishReady: boolean;
}): AdminTournamentWorkState {
  if (row.status === "pending_review") return "review";
  if (row.status === "draft" && row.publishReady) return "ready";
  if (row.status === "draft") return "needs_details";
  if (row.status === "published") return "published";
  if (row.status === "archived") return "archived";
  return "rejected";
}

export function adminTournamentQueue(
  filters: AdminTournamentListFilters
): AdminTournamentQueue {
  if (filters.status === "pending_review") return "review";
  if (filters.status === "draft" && filters.ready === true) return "ready";
  if (filters.status === "draft" && filters.ready === false) {
    return "needs_details";
  }
  if (filters.status === "draft") return "drafts";
  if (filters.status === "published") return "published";
  if (filters.status === "archived") return "archived";
  if (filters.status === "rejected") return "rejected";
  return "all";
}

export function adminTournamentQueueHref(
  filters: AdminTournamentListFilters,
  queue: AdminTournamentQueue
): string {
  const preserved: AdminTournamentListFilters = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.timing ? { timing: filters.timing } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.mode ? { mode: filters.mode } : {}),
    ...(filters.audience ? { audience: filters.audience } : {}),
  };
  if (queue === "review") {
    return adminTournamentsHref(preserved, { status: "pending_review" });
  }
  if (queue === "ready") {
    return adminTournamentsHref(preserved, { status: "draft", ready: true });
  }
  if (queue === "needs_details") {
    return adminTournamentsHref(preserved, { status: "draft", ready: false });
  }
  if (queue === "drafts") {
    return adminTournamentsHref(preserved, { status: "draft" });
  }
  if (queue === "published") {
    return adminTournamentsHref(preserved, { status: "published" });
  }
  if (queue === "archived") {
    return adminTournamentsHref(preserved, { status: "archived" });
  }
  if (queue === "rejected") {
    return adminTournamentsHref(preserved, { status: "rejected" });
  }
  return adminTournamentsHref(preserved);
}

export const ADMIN_TOURNAMENT_TYPE_OPTIONS = COMPETITION_TYPES.map((type) => ({
  value: type.id,
  label: type.label,
}));

export const ADMIN_TOURNAMENT_MODE_OPTIONS: {
  value: ParticipationMode;
  label: string;
}[] = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export const ADMIN_TOURNAMENT_AUDIENCE_OPTIONS =
  COMPETITION_AUDIENCE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

export function parseAdminTournamentFilters(input: {
  status?: string;
  source?: string;
  ready?: string;
  category?: string;
  timing?: string;
  q?: string;
  state?: string;
  mode?: string;
  audience?: string;
}): AdminTournamentListFilters {
  const status = ADMIN_TOURNAMENT_STATUSES.includes(
    input.status as AdminTournamentStatus
  )
    ? (input.status as AdminTournamentStatus)
    : undefined;
  const category = CompetitionCategorySchema.safeParse(input.category);
  const mode = ParticipationModeSchema.safeParse(input.mode);
  const audience = CompetitionAudienceSchema.safeParse(input.audience);
  const timing =
    input.timing === "upcoming" || input.timing === "ended"
      ? input.timing
      : undefined;
  const q = input.q?.trim().slice(0, 80) || undefined;
  const stateMatch = input.state?.trim().toUpperCase().match(/^[A-Z]{2}$/);
  const source = input.source?.trim() || undefined;

  return {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(input.ready === "1"
      ? { ready: true }
      : input.ready === "0"
        ? { ready: false }
        : {}),
    ...(category.success ? { category: category.data } : {}),
    ...(timing ? { timing } : {}),
    ...(q ? { q } : {}),
    ...(stateMatch ? { state: stateMatch[0] } : {}),
    ...(mode.success ? { mode: mode.data } : {}),
    ...(audience.success ? { audience: audience.data } : {}),
  };
}

export function adminTournamentsHaveFilters(
  filters: AdminTournamentListFilters
): boolean {
  return Boolean(
    filters.status ||
      filters.source ||
      filters.ready !== undefined ||
      filters.category ||
      filters.timing ||
      filters.q ||
      filters.state ||
      filters.mode ||
      filters.audience
  );
}

export function adminTournamentsHref(
  filters: AdminTournamentListFilters = {},
  overrides: Partial<AdminTournamentListFilters> = {}
): string {
  const merged: AdminTournamentListFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.status) params.set("status", merged.status);
  if (merged.source) params.set("source", merged.source);
  if (merged.timing) params.set("timing", merged.timing);
  if (merged.q) params.set("q", merged.q);
  if (merged.state) params.set("state", merged.state);
  if (merged.mode) params.set("mode", merged.mode);
  if (merged.audience) params.set("audience", merged.audience);
  if (merged.ready === true) params.set("ready", "1");
  if (merged.ready === false) params.set("ready", "0");
  const query = params.toString();
  return query ? `/admin/tournaments?${query}` : "/admin/tournaments";
}
