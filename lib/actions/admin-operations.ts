"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import {
  ADMIN_RUNNABLE_SCRAPER_SOURCES,
  isAdminRunnableScraperSource,
  isAdminScraperSource,
  type AdminRunnableScraperSource,
  type AdminScraperSource,
} from "@/lib/admin-scrapers";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import { getGitHubIngestionConfig } from "@/lib/github-ingestion";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BULK_DELETE_CAP = 100;
const ADMIN_SCRAPER_DISPATCH_CAP = ADMIN_RUNNABLE_SCRAPER_SOURCES.length;
const DeleteTournamentsSchema = z.object({
  competitionIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one tournament.")
    .max(BULK_DELETE_CAP, `Select at most ${BULK_DELETE_CAP} tournaments.`),
});
const DeleteAllTournamentsSchema = z.object({
  confirmation: z.literal("DELETE ALL TOURNAMENTS"),
});

function revalidateTournamentSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/tournaments");
  for (const category of DISCOVERY_CATEGORIES) {
    revalidatePath(category.href);
  }
}

export async function adminDeleteTournaments(input: {
  competitionIds: string[];
}): Promise<ActionResult<{ deleted: number; skipped: number }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }

  const parsed = DeleteTournamentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Check the selected tournaments.",
    };
  }

  const ids = [...new Set(parsed.data.competitionIds)];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_delete_competitions", {
    p_competition_ids: ids,
    p_delete_all: false,
  });
  if (error) {
    console.error("Admin tournament deletion failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      error: error.message.includes("admin_delete_competitions")
        ? "Tournament deletion is unavailable on this deployment."
        : "Could not delete the selected tournaments.",
    };
  }

  const deleted = Number(data ?? 0);
  revalidateTournamentSurfaces();
  return { ok: true, deleted, skipped: ids.length - deleted };
}

export async function adminDeleteAllTournaments(input: {
  confirmation: string;
}): Promise<ActionResult<{ deleted: number }>> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }

  const parsed = DeleteAllTournamentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Type DELETE ALL TOURNAMENTS to confirm permanent deletion.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_delete_competitions", {
    p_competition_ids: null,
    p_delete_all: true,
  });
  if (error) {
    console.error("Admin bulk tournament deletion failed:", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      error: error.message.includes("admin_delete_competitions")
        ? "Tournament deletion is unavailable on this deployment."
        : "Could not delete all tournaments.",
    };
  }

  revalidateTournamentSurfaces();
  return { ok: true, deleted: Number(data ?? 0) };
}

function normalizeAdminScraperDispatch(
  input: { source?: string; sources?: string[] }
): AdminScraperSource[] | null {
  if (input.sources) {
    const unique = [...new Set(input.sources)];
    if (!unique.length || unique.length > ADMIN_SCRAPER_DISPATCH_CAP) {
      return null;
    }
    if (unique.length === 1 && unique[0] === "all") {
      return ["all"];
    }
    if (unique.every(isAdminRunnableScraperSource)) {
      const selected = unique as AdminRunnableScraperSource[];
      if (
        selected.length === ADMIN_RUNNABLE_SCRAPER_SOURCES.length &&
        ADMIN_RUNNABLE_SCRAPER_SOURCES.every((source) =>
          selected.includes(source)
        )
      ) {
        return ["all"];
      }
      return selected;
    }
    return null;
  }
  if (input.source && isAdminScraperSource(input.source)) {
    return [input.source];
  }
  return null;
}

async function dispatchIngestionWorkflow(input: {
  sources: AdminScraperSource[];
  repository: string;
  ref: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${input.repository}/actions/workflows/ingest.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${input.token}`,
          "User-Agent": "causey-admin",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: input.ref,
          inputs: {
            source: input.sources[0],
            sources:
              input.sources.length > 1 ? input.sources.join(",") : "",
          },
        }),
        cache: "no-store",
      }
    );
  } catch {
    return {
      ok: false,
      error: "Could not reach GitHub Actions. Try again.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        response.status === 401 || response.status === 403
          ? "GitHub rejected the dispatch token. Confirm it has Actions write access."
          : response.status === 404
            ? "The ingestion workflow or configured repository could not be found."
            : "GitHub Actions did not accept the scraper request.",
    };
  }

  return { ok: true };
}

export async function adminRunScraper(input: {
  source?: string;
  sources?: string[];
}): Promise<
  ActionResult<{
    sources: AdminScraperSource[];
    workflowUrl: string;
  }>
> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }

  const sources = normalizeAdminScraperDispatch(input);
  if (!sources) {
    return { ok: false, error: "Choose at least one valid tournament scraper." };
  }

  const github = getGitHubIngestionConfig();
  if (!github.ok) {
    return {
      ok: false,
      error:
        "Scraper runs are unavailable on this deployment. Ask the deployment owner to review ingestion access.",
    };
  }

  const { repository, ref, token, workflowUrl } = github.config;
  const supabase = await createServerSupabaseClient();

  const dispatched = await dispatchIngestionWorkflow({
    sources,
    repository,
    ref,
    token,
  });
  if (!dispatched.ok) {
    return dispatched;
  }
  for (const source of sources) {
    await supabase.rpc("record_admin_scraper_dispatch", {
      p_source: source,
      p_repository: repository,
      p_ref: ref,
    });
  }

  revalidatePath("/admin/scrapers");

  return {
    ok: true,
    sources,
    workflowUrl,
  };
}
