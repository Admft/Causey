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
  ready?: boolean;
  category?: CompetitionCategory;
  timing?: TimingFilter;
  q?: string;
  state?: string;
  mode?: ParticipationMode;
  audience?: CompetitionAudience;
};

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
    ...(input.ready === "1" ? { ready: true } : {}),
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
      filters.ready ||
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
  if (merged.ready) params.set("ready", "1");
  const query = params.toString();
  return query ? `/admin/tournaments?${query}` : "/admin/tournaments";
}
