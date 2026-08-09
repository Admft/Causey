"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/result";
import {
  isAdminScraperSource,
  type AdminScraperSource,
} from "@/lib/admin-scrapers";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getGitHubIngestionConfig } from "@/lib/github-ingestion";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BULK_DELETE_CAP = 100;
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
  revalidatePath("/chess");
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

export async function adminRunScraper(input: {
  source: string;
}): Promise<
  ActionResult<{
    source: AdminScraperSource;
    workflowUrl: string;
  }>
> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    return { ok: false, error: "Platform administrator access required." };
  }
  if (!isAdminScraperSource(input.source)) {
    return { ok: false, error: "Choose a valid tournament scraper." };
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
  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/ingest.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "causey-admin",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref,
          inputs: { source: input.source },
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

  const supabase = await createServerSupabaseClient();
  await supabase.rpc("record_admin_scraper_dispatch", {
    p_source: input.source,
    p_repository: repository,
    p_ref: ref,
  });
  revalidatePath("/admin/scrapers");

  return {
    ok: true,
    source: input.source,
    workflowUrl,
  };
}
