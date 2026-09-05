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
        new Request("https://app.causey.dev/api/mobile/me", {
          headers: { authorization: "Bearer tok_123" },
        })
      )
    ).toBe("tok_123");
    expect(
      accessTokenFromRequest(
        new Request("https://app.causey.dev/api/mobile/me")
      )
    ).toBeNull();
    expect(
      accessTokenFromRequest(
        new Request("https://app.causey.dev/api/mobile/me", {
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
    // Guideline 4: sending a reviewer to Safari to create an account is the
    // single most common rejection for a companion app.
    for (const screen of AUTH_SCREENS) {
      expect(read(screen)).not.toContain("Linking.openURL");
    }
    expect(read("mobile/app/login.tsx")).toContain('router.push("/signup")');
    expect(read("mobile/app/login.tsx")).toContain(
      'router.push("/forgot-password")'
    );
    expect(read("mobile/src/auth.tsx")).toContain("supabase.auth.signUp");
    expect(read("mobile/src/auth.tsx")).toContain("resetPasswordForEmail");
  });

  it("never asks for a birth date on a phone and only signs up adults", () => {
    expect(read("mobile/app/signup.tsx")).not.toContain("date_of_birth");
    expect(read("mobile/app/signup.tsx")).not.toContain('"student"');
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
        "https://app.causey.dev"
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
    // The Search tab must show results on open, not an empty form.
    expect(read("mobile/app/(tabs)/search.tsx")).toContain("useEffect");
    expect(read("mobile/app/(tabs)/search.tsx")).toContain("No upcoming chess");
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
