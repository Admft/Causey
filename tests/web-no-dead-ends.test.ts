import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { attemptAction } from "@/lib/attempt-action";
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/browser-fetch";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/**
 * Same rule the phone app follows: every branch has to end somewhere a person
 * can act. A spinner waiting on a request that already failed, or a button
 * disabled forever, is the one outcome none of these screens may produce.
 */
describe("a hung request fails instead of spinning", () => {
  it("aborts once the deadline passes and says which failure it was", async () => {
    vi.useFakeTimers();
    try {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(
          (_input, init) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError"))
              );
            })
        );

      const pending = fetchWithTimeout("/api/competitions", { timeoutMs: 15000 });
      const assertion = expect(pending).rejects.toBeInstanceOf(FetchTimeoutError);
      await vi.advanceTimersByTimeAsync(15000);
      await assertion;
      expect(fetchSpy).toHaveBeenCalledOnce();
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it("keeps a caller's own abort distinguishable from a timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );
    try {
      const controller = new AbortController();
      const pending = fetchWithTimeout("/api/competitions", {
        signal: controller.signal,
      });
      controller.abort();
      await expect(pending).rejects.not.toBeInstanceOf(FetchTimeoutError);
      expect(controller.signal.aborted).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("puts search and pathways behind the deadline", () => {
    for (const path of [
      "components/SearchClient.tsx",
      "components/PathwayExplorer.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("fetchWithTimeout");
      expect(source).not.toMatch(/[^h]\bawait fetch\(/);
      expect(source).not.toMatch(/^\s*fetch\(/m);
    }
  });

  it("names a timeout differently from an unreachable server", () => {
    const source = read("components/SearchClient.tsx");
    expect(source).toContain("error instanceof FetchTimeoutError");
    expect(source).toContain("took too long to answer");
  });
});

describe("a failed save says so", () => {
  it("turns a thrown action into an ordinary failure result", async () => {
    const result = await attemptAction(async () => {
      throw new Error("network down");
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("connection");
  });

  it("passes a real result straight through", async () => {
    const result = await attemptAction(async () => ({
      ok: true as const,
      slug: "example-club",
    }));
    expect(result).toEqual({ ok: true, slug: "example-club" });
  });

  it("passes an anticipated failure straight through", async () => {
    const result = await attemptAction(async () => ({
      ok: false as const,
      error: "You are not a coach for this organization.",
    }));
    expect(result).toEqual({
      ok: false,
      error: "You are not a coach for this organization.",
    });
  });

  it.each([
    "components/NotificationPreferencesForm.tsx",
    "components/AnnouncementForm.tsx",
    "components/CompetitionComments.tsx",
    "components/RecommendEventPanel.tsx",
    "components/OrganizationSettingsForm.tsx",
    "components/PublishTournamentPanel.tsx",
    "components/CancelTournamentButton.tsx",
    "components/LeaveOrgButton.tsx",
    "components/RemoveMemberButton.tsx",
    "components/JoinByCodeButton.tsx",
    "components/ClaimInvitationButton.tsx",
    "components/ClaimCodeInvitationButton.tsx",
    "components/OrgCreateForm.tsx",
    "components/DistrictSchoolForm.tsx",
    "components/MissingZipCard.tsx",
    "components/ZipCaptureField.tsx",
    "components/EntrantManager.tsx",
    "components/GroupManager.tsx",
    "components/NotificationInboxActions.tsx",
  ])("%s cannot swallow a dropped connection", (path) => {
    const source = read(path);
    expect(source).toContain("attemptAction");
  });

  it("clears which group action was running, even when it failed", () => {
    const source = read("components/GroupManager.tsx");
    // Three transitions, each with a finally that resets the label.
    expect(source.match(/setPendingAction\(null\)/g)?.length).toBe(3);
  });

  it("lets a navigation button re-enable itself", () => {
    for (const path of [
      "components/ClaimCodeForm.tsx",
      "components/HomeHeroSearch.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("useTransition");
      expect(source).not.toContain("setPending(true)");
    }
  });
});

describe("signed in but the profile never arrived", () => {
  it.each(["app/account/page.tsx", "app/me/page.tsx", "app/family/page.tsx"])(
    "%s offers a way out",
    (path) => {
      const source = read(path);
      expect(source).toContain("ProfileNotReady");
    }
  );

  it("guards the parent desk against a null profile", () => {
    const source = read("app/family/page.tsx");
    expect(source).toContain('if (!profile) return <ProfileNotReady');
    // The old check let a null profile fall through to the parent desk.
    expect(source).not.toContain("if (profile && profile.role !== \"parent\")");
  });

  it("gives the escape hatch a retry, a sign-out, and support", () => {
    const source = read("components/ProfileNotReady.tsx");
    expect(source).toContain("router.refresh()");
    expect(source).toContain("signOutAndLeave");
    expect(source).toContain('href="/support"');
  });
});

describe("sign-out leaves nothing behind on a shared computer", () => {
  it("replaces the document instead of navigating inside it", () => {
    const source = read("lib/auth/sign-out.ts");
    expect(source).toContain("window.location.assign");
    // A failed revoke must still clear the session and leave.
    expect(source).toContain('scope: "local"');
  });

  it.each([
    "components/AuthNav.tsx",
    "components/AccountDataControls.tsx",
    "components/ClaimInvitationAuth.tsx",
  ])("%s uses the shared sign-out", (path) => {
    const source = read(path);
    expect(source).toContain("signOutAndLeave");
    expect(source).not.toContain("auth.signOut()");
  });
});

describe("every failing surface has a boundary", () => {
  it.each([
    "app/error.tsx",
    "app/global-error.tsx",
    "app/not-found.tsx",
    "app/family/error.tsx",
    "app/event/error.tsx",
    "app/orgs/error.tsx",
    "app/admin/error.tsx",
  ])("%s exists", (path) => {
    expect(existsSync(join(root, path))).toBe(true);
  });

  it("pairs every loading skeleton with an error boundary", () => {
    for (const segment of ["app/event", "app/orgs", "app/admin", "app/family"]) {
      if (!existsSync(join(root, segment, "loading.tsx"))) continue;
      expect(existsSync(join(root, segment, "error.tsx"))).toBe(true);
    }
  });

  it.each([
    "app/family/error.tsx",
    "app/event/error.tsx",
    "app/orgs/error.tsx",
    "app/admin/error.tsx",
  ])("%s offers a retry and a way back", (path) => {
    const source = read(path);
    expect(source).toContain("reset");
    expect(source).toContain("href=");
  });

  it("keeps the root boundary usable without the stylesheet", () => {
    const source = read("app/global-error.tsx");
    expect(source).toContain("<html");
    expect(source).toContain("<body");
    expect(source).toContain('href="/support"');
  });
});

describe("authenticated pages declare that they are not shareable", () => {
  it.each([
    "app/page.tsx",
    "app/chess/page.tsx",
    "app/support/page.tsx",
    "app/me/page.tsx",
    "app/me/notifications/page.tsx",
    "app/account/page.tsx",
    "app/family/page.tsx",
    "app/login/page.tsx",
    "app/signup/page.tsx",
    "app/claim/page.tsx",
    "app/orgs/page.tsx",
    "app/orgs/new/page.tsx",
    "app/orgs/[slug]/page.tsx",
    "app/orgs/[slug]/people/page.tsx",
    "app/orgs/[slug]/reports/page.tsx",
    "app/orgs/[slug]/settings/page.tsx",
    "app/orgs/[slug]/activity/page.tsx",
    "app/orgs/[slug]/roster/page.tsx",
  ])("%s is force-dynamic", (path) => {
    expect(read(path)).toContain('export const dynamic = "force-dynamic"');
  });
});
