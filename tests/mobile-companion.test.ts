import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { mobileAppAccess } from "@/lib/auth/mobile-access";
import { serializeFamilyDesk } from "@/lib/data/mobile-family";
import type { ChildSummary } from "@/lib/data/portal";
import { accessTokenFromRequest } from "@/lib/supabase/access-token";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("Bearer access tokens", () => {
  it("reads a Bearer header and ignores other schemes", () => {
    expect(
      accessTokenFromRequest(
        new Request("https://causey.dev/api/mobile/me", {
          headers: { authorization: "Bearer tok_123" },
        })
      )
    ).toBe("tok_123");
    expect(
      accessTokenFromRequest(
        new Request("https://causey.dev/api/mobile/me")
      )
    ).toBeNull();
    expect(
      accessTokenFromRequest(
        new Request("https://causey.dev/api/mobile/me", {
          headers: { authorization: "Basic abc" },
        })
      )
    ).toBeNull();
  });
});

describe("mobile app access", () => {
  it("lets parents and coaches in without a date of birth", () => {
    expect(
      mobileAppAccess({ role: "parent", date_of_birth: null })
    ).toEqual({ allowed: true });
    expect(
      mobileAppAccess({ role: "coach", date_of_birth: null })
    ).toEqual({ allowed: true });
  });

  it("blocks students under 13 and students without a date of birth", () => {
    const asOf = new Date();
    const month = String(asOf.getMonth() + 1).padStart(2, "0");
    const day = String(asOf.getDate()).padStart(2, "0");
    const twelve = `${asOf.getFullYear() - 12}-${month}-${day}`;
    const thirteen = `${asOf.getFullYear() - 13}-${month}-${day}`;

    const under = mobileAppAccess({
      role: "student",
      date_of_birth: twelve,
    });
    expect(under.allowed).toBe(false);
    if (!under.allowed) expect(under.code).toBe("under_13");

    const noDob = mobileAppAccess({ role: "student", date_of_birth: null });
    expect(noDob.allowed).toBe(false);
    if (!noDob.allowed) expect(noDob.code).toBe("student_dob_required");

    expect(
      mobileAppAccess({ role: "student", date_of_birth: thirteen }).allowed
    ).toBe(true);
  });
});

describe("family desk payload", () => {
  it("puts unanswered invites first and flags organizer registration", () => {
    const children: ChildSummary[] = [
      {
        profile_id: "child-1",
        display_name: "Alex",
        orgs: [{ id: "org-1", name: "Lincoln", slug: "lincoln", type: "school" }],
        entrants: [
          {
            competition_id: "c-going",
            profile_id: "child-1",
            status: "going",
            responded_by: "parent-1",
            response_source: "parent",
            placement: null,
            award_label: null,
            section_name: null,
            registration_status: null,
            competition: {
              slug: "spring-open",
              name: "Spring Open",
              city: "Austin",
              state: "TX",
              start_date: "2099-05-01",
              end_date: "2099-05-01",
              reg_url: "https://example.test/reg",
            },
          },
          {
            competition_id: "c-invited",
            profile_id: "child-1",
            status: "invited",
            responded_by: null,
            response_source: null,
            placement: null,
            award_label: null,
            section_name: null,
            registration_status: null,
            competition: {
              slug: "fall-open",
              name: "Fall Open",
              city: "Dallas",
              state: "TX",
              start_date: "2099-06-01",
              end_date: "2099-06-01",
              reg_url: null,
            },
          },
        ],
      },
    ];
    const payload = serializeFamilyDesk(children, "2026-09-04");
    expect(payload[0]?.needs_action[0]?.competition?.slug).toBe("fall-open");
    expect(payload[0]?.needs_action[1]?.needs_organizer_registration).toBe(true);
  });
});

describe("mobile companion sources", () => {
  it("requires a Bearer token on family and RSVP routes", () => {
    expect(read("app/api/mobile/me/route.ts")).toContain("getMobileAuth");
    expect(read("app/api/mobile/family/route.ts")).toContain("getMobileAuth");
    expect(read("app/api/mobile/rsvp/route.ts")).toContain("performSetRsvp");
    expect(read("app/api/mobile/rsvp/route.ts")).toContain("auth.access.allowed");
    expect(read("lib/auth/mobile-request.ts")).toContain("accessTokenFromRequest");
    expect(read("lib/supabase/access-token.ts")).toContain("Bearer");
    expect(read("lib/auth/mobile-request.ts")).not.toContain("date_of_birth");
    expect(read("lib/auth/mobile-request.ts")).toContain("mobilePublicProfile");
  });

  it("is a native Expo app, not a WebView of the website", () => {
    const appJson = read("mobile/app.json");
    expect(appJson).toContain('"scheme": "causey"');
    expect(appJson).toContain("dev.causey.app");
    expect(read("mobile/app/(tabs)/_layout.tsx")).toContain("Family");
    expect(read("mobile/app/(tabs)/_layout.tsx")).toContain("Search");
    expect(read("mobile/app/(tabs)/family.tsx")).toContain("needs_action");
    expect(read("mobile/app/(tabs)/search.tsx")).toContain("/api/competitions");
    expect(read("mobile/app/(tabs)/family.tsx")).not.toContain("WebView");
    expect(read("mobile/app/(tabs)/search.tsx")).not.toContain("WebView");
  });

  it("publishes store support and 13+ copy", () => {
    expect(read("app/support/page.tsx")).toContain("Ages 13 and up");
    expect(read("app/privacy/page.tsx")).toContain("iOS and Android apps");
    expect(read("app/privacy/page.tsx")).toContain("not currently collect push tokens");
    expect(read("app/terms/page.tsx")).toContain("not a kids app");
    expect(read("app/layout.tsx")).toContain('href="/support"');
  });
});

describe("App Store readiness", () => {
  const AUTH_SCREENS = [
    "mobile/app/login.tsx",
    "mobile/app/signup.tsx",
    "mobile/app/forgot-password.tsx",
  ];

  it("keeps sign-in, sign-up, and password reset inside the app", () => {
    // Guideline 4: sending a reviewer to Safari to create a parent or coach
    // account is a common rejection. Trust documents may open in a browser.
    // 13+ student signup is the exception: it needs a date of birth, which
    // the phone never collects, so that form stays on the website.
    const WEB_ACCOUNT_PATHS = [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/account",
    ];
    for (const screen of AUTH_SCREENS) {
      const source = read(screen);
      for (const path of WEB_ACCOUNT_PATHS) {
        expect(source).not.toContain(`siteUrl}${path}`);
      }
      expect(source).not.toContain("siteUrl}/signup`");
      expect(source).not.toContain('siteUrl}/signup"');
    }
    expect(read("mobile/app/login.tsx")).toContain('router.push("/signup")');
    expect(read("mobile/app/login.tsx")).toContain(
      'router.push("/forgot-password")'
    );
    expect(read("mobile/src/auth.tsx")).toContain("supabase.auth.signUp");
    expect(read("mobile/src/auth.tsx")).toContain("resetPasswordForEmail");
  });

  it("never asks for a birth date on a phone and only signs up adults in-app", () => {
    const signup = read("mobile/app/signup.tsx");
    expect(signup).not.toContain("date_of_birth");
    expect(signup).not.toContain('value: "student"');
    expect(signup).toContain("/signup?role=student");
    expect(signup).toContain("Create a student account (13+) on the website");
    expect(read("mobile/app/login.tsx")).toContain("/signup?role=student");
    expect(read("mobile/app/(tabs)/me.tsx")).toContain("/signup?role=student");
    expect(read("mobile/src/auth.tsx")).toContain("date_of_birth: null");
    expect(read("mobile/src/auth.tsx")).toContain("age_band: null");
    expect(read("mobile/src/auth.tsx")).toContain(
      'MobileSignupRole = "parent" | "coach"'
    );
  });

  it("offers in-app account deletion, including to blocked under-13 accounts", () => {
    const route = read("app/api/mobile/account/route.ts");
    expect(route).toContain("export async function DELETE");
    expect(route).toContain("performDeleteOwnAccount");
    // Guideline 5.1.1(v): a blocked account must still be able to delete itself.
    expect(route).not.toContain("auth.access.allowed");
    expect(read("lib/account-delete.ts")).toContain("delete_own_account");

    const section = read("mobile/src/DeleteAccountSection.tsx");
    expect(section).toContain("deleteAccount");
    expect(section).toContain("to confirm");
    expect(read("mobile/src/auth.tsx")).toContain('"/api/mobile/account"');
    for (const screen of ["mobile/app/(tabs)/me.tsx", "mobile/app/blocked.tsx"]) {
      expect(read(screen)).toContain("DeleteAccountSection");
    }
  });

  it("declares privacy manifests and a calendar reason for iOS", () => {
    const appJson = read("mobile/app.json");
    expect(appJson).toContain("privacyManifests");
    expect(appJson).toContain("NSPrivacyAccessedAPICategoryUserDefaults");
    expect(appJson).toContain("NSPrivacyTracking");
    expect(appJson).toContain("NSCalendarsUsageDescription");
    expect(JSON.parse(appJson).expo.ios.privacyManifests.NSPrivacyTracking).toBe(
      false
    );
  });

  it("pins the production API in every EAS build profile", () => {
    const eas = JSON.parse(read("mobile/eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    const profiles = Object.keys(eas.build);
    expect(profiles).toContain("preview");
    expect(profiles).toContain("production");
    for (const profile of profiles) {
      expect(eas.build[profile]?.env?.EXPO_PUBLIC_CAUSEY_API_URL).toBe(
        "https://causey.dev"
      );
    }
  });

  it("ships the real Causey mark rather than the Expo placeholder", () => {
    expect(read("app/icon-1024/route.tsx")).toContain("causeyAppIcon(1024)");
    expect(read("scripts/export-mobile-icons.tsx")).toContain("causeyAppIcon");
    expect(read("mobile/app.json")).toContain("./assets/icon.png");
    for (const asset of [
      "mobile/assets/icon.png",
      "mobile/assets/splash-icon.png",
      "mobile/assets/android-icon-foreground.png",
    ]) {
      expect(statSync(resolve(process.cwd(), asset)).size).toBeGreaterThan(1000);
    }
  });

  it("has native depth beyond a list of links", () => {
    const event = read("mobile/app/event/[slug].tsx");
    expect(event).toContain("addTournamentToCalendar");
    expect(event).toContain("Share.share");
    expect(read("mobile/src/calendar.ts")).toContain(
      "requestCalendarPermissions"
    );
    expect(read("mobile/src/haptics.ts")).toContain("notificationAsync");
    expect(read("mobile/app/(tabs)/family.tsx")).toContain('feedback("success")');
    expect(read("mobile/app/(tabs)/family.tsx")).toContain("readCache");
    expect(read("mobile/app/(tabs)/_layout.tsx")).toContain("tabBarIcon");
  });

  it("fails fast instead of spinning forever on a dead network", () => {
    const api = read("mobile/src/api.ts");
    expect(api).toContain("AbortController");
    expect(api).toContain("TIMEOUT_MS");
    expect(api).toContain("res.status === 404");
    expect(api).toContain("This screen is not on the server this app is talking to.");
    // The Search tab must show results on open, not an empty form.
    expect(read("mobile/app/(tabs)/search.tsx")).toContain("useEffect");
    expect(read("mobile/src/categories.ts")).toContain("No upcoming chess");
    expect(read("mobile/src/ui.tsx")).toContain("SafeAreaView");
    expect(read("mobile/app/login.tsx")).not.toContain("paddingTop: 80");
  });

  it("documents what App Store Connect will ask for", () => {
    const kit = read("mobile/APP-STORE.md");
    expect(kit).toContain("Demo account");
    expect(kit).toContain("DATA_SOURCE=supabase");
    expect(kit).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    expect(kit).toContain("/support");
    expect(kit).toContain("/privacy");
    expect(kit).toContain("/terms");
  });
});

describe("every signed-in role has a home", () => {
  it("gives parents, students, and coaches their own first tab", () => {
    const roles = read("mobile/src/roles.ts");
    expect(roles).toContain('if (role === "coach") return "/team"');
    expect(roles).toContain('if (role === "student") return "/plan"');
    expect(roles).toContain('return "/family"');

    const layout = read("mobile/app/(tabs)/_layout.tsx");
    expect(layout).toContain("homeRouteForRole");
    for (const tab of ["family", "plan", "team"]) {
      expect(layout).toContain(`name="${tab}"`);
    }
  });

  it("never redirects a signed-in account onto a hidden tab", () => {
    // A student or coach sent to /family would land on a tab with no button.
    for (const screen of [
      "mobile/app/index.tsx",
      "mobile/app/login.tsx",
      "mobile/app/signup.tsx",
      "mobile/app/blocked.tsx",
    ]) {
      expect(read(screen)).not.toContain('"/family"');
    }
    expect(read("mobile/app/index.tsx")).toContain("AccountHomeRedirect");
  });

  it("waits for the profile instead of guessing the parent home", () => {
    // The session lands before the profile on a fresh sign-in; reading role
    // too early sent students and coaches to Family.
    const guard = read("mobile/src/RoleHomeGuard.tsx");
    expect(guard).toContain('if (!profile)');
    expect(guard).toContain('{ kind: "wait" }');
    expect(guard).toContain("homeRouteForRole");
    // A profile that never loads must not spin forever.
    expect(guard).toContain("Try again");
    expect(guard).toContain("refreshMe");
  });

  it("lets a visitor browse tournaments without an account", () => {
    // Guideline 5.1.1(i): chess search is public on the website, so a reviewer
    // should not need to create an account to see a single tournament.
    const layout = read("mobile/app/(tabs)/_layout.tsx");
    expect(layout).not.toContain('if (!session) return <Redirect href="/login" />');
    expect(layout).toContain("const signedIn = Boolean(session)");

    const guard = read("mobile/src/RoleHomeGuard.tsx");
    expect(guard).toContain('kind: "anonymous"');
    expect(guard).toContain('<Redirect href="/search" />');

    // The signed-out Me tab is how a visitor reaches sign-in, and it must not
    // offer account deletion for an account that does not exist.
    const me = read("mobile/app/(tabs)/me.tsx");
    expect(me).toContain("browsing as a guest");
    expect(me).toContain('router.push("/login")');
    expect(me).toContain('router.push("/signup")');
    expect(me).toContain("ready && !session");

    // Login is no longer the forced entry point, so it needs a way back out.
    expect(read("mobile/app/login.tsx")).toContain(
      "Browse tournaments without an account"
    );
  });

  it("searches each public directory with Soonest and Popular sorts", () => {
    const search = read("mobile/app/(tabs)/search.tsx");
    expect(search).toContain("CategoryTileGrid");
    expect(search).not.toContain("CATEGORY_MARKS");
    expect(search).not.toContain("styles.hero");
    expect(search).toContain('useState<DiscoveryCategoryId>("chess")');
    expect(search).toContain('useState<SearchSort>("soonest")');
    expect(read("mobile/src/search-filters.ts")).toContain('label: "Soonest"');
    expect(read("mobile/src/search-filters.ts")).toContain('label: "Popular"');
    expect(search).not.toContain("Official first");
    expect(search).not.toContain('"official"');
    expect(search).toContain("sort: nextSort");
    expect(search).toContain("category: nextCategory");
    expect(search).toContain('params.set("q", name)');
    expect(search).toContain('label: "Pathways"');
    expect(search).toContain("ChessNationalsPin");
    expect(search).toContain("PathwayExplorer");
    expect(search).toContain("styles.grid");
    expect(search).not.toContain("All types");
    expect(search).not.toContain('value: "all", label: "All types"');
    const categories = read("mobile/src/categories.ts");
    for (const id of ["chess", "debate", "stem", "arts", "writing"]) {
      expect(categories).toContain(`id: "${id}"`);
    }
    expect(categories).toContain("emptyUpcoming");
    expect(categories).not.toContain("ALL_TYPES");
    expect(read("mobile/app/event/[slug].tsx")).toContain("categoryLabel");
    expect(read("mobile/app/event/[slug].tsx")).not.toContain(
      "<Kicker>Chess</Kicker>"
    );
  });

  it("shows the terms and privacy notice where the account is created", () => {
    const signup = read("mobile/app/signup.tsx");
    expect(signup).toContain("siteUrl}/privacy");
    expect(signup).toContain("siteUrl}/terms");
    expect(signup).toContain("terms of use");
  });

  it("stops a hidden tab from rendering for the wrong role", () => {
    const homes: [string, string][] = [
      ["mobile/app/(tabs)/family.tsx", '"/family"'],
      ["mobile/app/(tabs)/plan.tsx", '"/plan"'],
      ["mobile/app/(tabs)/team.tsx", '"/team"'],
    ];
    for (const [screen, home] of homes) {
      const source = read(screen);
      expect(source).toContain("RoleHomeGuard");
      expect(source).toContain(`home=${home}`);
    }
  });

  it("backs the coach signup option with real coach work", () => {
    // Signup offers Coach, so the app owes a coach something to do.
    expect(read("mobile/app/signup.tsx")).toContain('value: "coach"');
    const team = read("mobile/app/(tabs)/team.tsx");
    expect(team).toContain("/api/mobile/team");
    expect(team).toContain("Take attendance");
    expect(team).toContain("/roster/");

    const attendance = read("mobile/app/attendance/[competitionId].tsx");
    expect(attendance).toContain("/api/mobile/attendance");
    expect(attendance).toContain("did_not_attend");
  });

  it("lets a student answer their own invitations", () => {
    const plan = read("mobile/app/(tabs)/plan.tsx");
    expect(plan).toContain("/api/mobile/plan");
    expect(plan).toContain("/api/mobile/rsvp");
    expect(plan).toContain("EntrantRow");
    expect(read("app/api/mobile/plan/route.ts")).toContain("getMobilePlan");
  });

  it("shares one attendance permission path with the website", () => {
    const shared = read("lib/attendance-write.ts");
    expect(shared).toContain("can_manage_competition");
    expect(shared).toContain("can_invite_to_competition");
    expect(shared).toContain("Only competition staff can record attendance.");
    for (const caller of [
      "lib/actions/district.ts",
      "app/api/mobile/attendance/route.ts",
    ]) {
      expect(read(caller)).toContain("performMarkAttendance");
    }
  });

  it("keeps desk work off the phone", () => {
    // Invites, CSV, settings, and reports stay on the website by design.
    const team = read("mobile/app/(tabs)/team.tsx");
    for (const deskWord of ["CSV", "settings", "reports"]) {
      expect(team).toContain(deskWord);
    }
    // A district office has no roster to open.
    expect(read("app/api/mobile/roster/route.ts")).toContain(
      "canMarkOrganizationAttending"
    );
  });
});
