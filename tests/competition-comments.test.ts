import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMPETITION_COMMENT_MAX_LENGTH,
  parseCompetitionCommentBody,
} from "@/lib/competition-comments";
import {
  isPlausibleUsCoordinate,
  nearestZipFromCoords,
} from "@/lib/nearest-zip";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0066_competition_comments_and_home_geo.sql"),
  "utf8"
);
const eventPage = readFileSync(
  resolve(process.cwd(), "app/event/[slug]/page.tsx"),
  "utf8"
);
const commentsUi = readFileSync(
  resolve(process.cwd(), "components/CompetitionComments.tsx"),
  "utf8"
);
const rateLimit = readFileSync(resolve(process.cwd(), "lib/rate-limit.ts"), "utf8");
const geoRoute = readFileSync(
  resolve(process.cwd(), "app/api/geo/nearest-zip/route.ts"),
  "utf8"
);

describe("competition comments", () => {
  it("stores public notes on visible competitions and stamps a display-name snapshot", () => {
    expect(migration).toContain("create table if not exists public.competition_comments");
    expect(migration).toContain("stamp_competition_comment");
    expect(migration).toContain("comments_select_if_competition_visible");
    expect(migration).toContain("comments_insert_own");
    expect(migration).toContain("comments_delete_own_or_platform_admin");
    expect(migration).not.toContain("forums");
    expect(eventPage).toContain("CompetitionComments");
    expect(commentsUi).toContain("Do not post other students");
    expect(commentsUi).toContain("not a private message thread");
  });

  it("trims bodies and rejects empty or oversized comments", () => {
    expect(parseCompetitionCommentBody("  hello  ")).toBe("hello");
    expect(parseCompetitionCommentBody("   ")).toBeNull();
    expect(parseCompetitionCommentBody("a".repeat(COMPETITION_COMMENT_MAX_LENGTH))).toHaveLength(
      COMPETITION_COMMENT_MAX_LENGTH
    );
    expect(
      parseCompetitionCommentBody("a".repeat(COMPETITION_COMMENT_MAX_LENGTH + 1))
    ).toBeNull();
  });

  it("rate-limits comment posts through the expanded consume_rate_limit allowlist", () => {
    expect(migration).toContain("'comment'");
    expect(rateLimit).toContain('"comment"');
    expect(readFileSync(resolve(process.cwd(), "lib/actions/comments.ts"), "utf8")).toContain(
      '"comment"'
    );
  });
});

describe("zip capture from location", () => {
  it("maps coordinates to the closest sample zip and rejects non-US points", () => {
    const rows = [
      { zip: "75201", lat: 32.787, lng: -96.799 },
      { zip: "78701", lat: 30.267, lng: -97.743 },
    ];
    expect(nearestZipFromCoords(32.78, -96.8, rows)).toBe("75201");
    expect(nearestZipFromCoords(30.27, -97.74, rows)).toBe("78701");
    expect(isPlausibleUsCoordinate(51.5, -0.12)).toBe(false);
    expect(nearestZipFromCoords(51.5, -0.12, rows)).toBeNull();
  });

  it("asks for a zip on signup, account, and signed-in landings", () => {
    expect(readFileSync(resolve(process.cwd(), "components/SignupForm.tsx"), "utf8")).toContain(
      "ZipCaptureField"
    );
    expect(readFileSync(resolve(process.cwd(), "components/ProfileEditor.tsx"), "utf8")).toContain(
      "ZipCaptureField"
    );
    expect(readFileSync(resolve(process.cwd(), "app/me/page.tsx"), "utf8")).toContain(
      "MissingZipCard"
    );
    expect(readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8")).toContain(
      "MissingZipCard"
    );
    expect(geoRoute).toContain("nearest_zip");
    expect(readFileSync(resolve(process.cwd(), "lib/rate-limit.ts"), "utf8")).toContain(
      '"geo"'
    );
    expect(readFileSync(resolve(process.cwd(), "lib/browser-zip.ts"), "utf8")).toContain(
      'allowsFeature?.("geolocation")'
    );
    expect(readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8")).toContain(
      "geolocation=(self)"
    );
  });
});
