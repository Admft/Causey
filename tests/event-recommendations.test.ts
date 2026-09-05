import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("event recommendations", () => {
  it("confirms sends by reading saved recipients, not the upsert body", () => {
    const action = source("lib/actions/recommendations.ts");
    expect(action).toContain("ignoreDuplicates: true");
    expect(action).not.toContain("return { ok: true, sent: data?.length ?? 0 }");
    expect(action).toContain('.select("to_profile_id")');
    expect(action).toContain('.in("to_profile_id", toProfileIds)');
    expect(action).toContain("if (!savedIds.length)");
    expect(action).toContain("toProfileIds: savedIds");
  });

  it("names who received the recommendation instead of Sent to 0 people", () => {
    const panel = source("components/RecommendEventPanel.tsx");
    const eventPage = source("app/event/[slug]/page.tsx");
    expect(panel).toContain("Sent to ${formatNameList(lastSentNames)}.");
    expect(panel).toContain("They’ll get an Alerts update and see it on Plan.");
    expect(panel).not.toContain("Sent to {sent}");
    expect(panel).not.toContain('person" : "people');
    expect(eventPage).toContain("getSentRecommendationRecipientIds");
    expect(eventPage).toContain("alreadySentIds={sentRecommendationIds}");
  });

  it("writes an Alerts row for the student without widening the shared notification gate", () => {
    const migration = source(
      "supabase/migrations/0079_event_recommendation_alerts.sql"
    );
    const action = source("lib/actions/recommendations.ts");
    const plan = source("app/me/page.tsx");
    expect(migration).toContain(
      "function public.notify_event_recommendation("
    );
    expect(migration).not.toContain(
      "function public.create_in_app_notification("
    );
    expect(migration).toContain("from_profile_id = actor");
    expect(migration).toContain("to_profile_id = p_recipient_id");
    expect(migration).toContain("'recommendation:'");
    expect(migration).toContain("prefs.invitation is false");
    expect(migration).toContain("insert into public.notifications");
    expect(action).toContain('rpc("notify_event_recommendation"');
    expect(action).toContain('revalidatePath("/me/notifications")');
    expect(plan).toContain("getMyRecommendations");
    expect(plan).toContain('id="recommended"');
    expect(plan).toContain("See recommended events");
  });

  it("confirms tournament invites by reading saved invited rows, not the upsert body", () => {
    const action = source("lib/actions/entrants.ts");
    expect(action).toContain("ignoreDuplicates: true");
    expect(action).not.toContain("for (const row of data ?? [])");
    expect(action).toContain('.eq("status", "invited")');
    expect(action).toContain('.eq("invited_by", user.id)');
    expect(action).toContain("uniqueInvitedIds");
    expect(action).toContain("invited: uniqueInvitedIds.length");
  });
});
