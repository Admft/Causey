import "server-only";

import { COMPETITION_COMMENTS_PAGE_LIMIT } from "@/lib/competition-comments";
import { isSupabaseConfigured } from "@/lib/data/portal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CompetitionCommentRow = {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: string;
  userId: string;
  hiddenAt: string | null;
};

export async function listCompetitionComments(
  competitionId: string
): Promise<CompetitionCommentRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("competition_comments")
    .select("id, body, author_label, created_at, user_id, hidden_at")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
    .limit(COMPETITION_COMMENTS_PAGE_LIMIT);
  if (error || !data) return [];
  return [...data].reverse().map((row) => ({
    id: row.id as string,
    body: row.body as string,
    authorLabel: row.author_label as string,
    createdAt: row.created_at as string,
    userId: row.user_id as string,
    hiddenAt: (row.hidden_at as string | null) ?? null,
  }));
}
