import type { CompetitionCategory } from "@/lib/schemas";

/**
 * Per-site branding for scrapers / upcoming hubs.
 * Keep logos in public/sources/ and ids aligned with competitions.source
 * plus migration 0007 / 0019 ingestion_sources.
 */

export type IngestionSourceStatus = "live" | "soon";
export type SourceAutomationState =
  | "enabled"
  | "paused"
  | "blocked"
  | "reference";
export type SourceHealthState =
  | "healthy"
  | "warning"
  | "failing"
  | "paused"
  | "blocked"
  | "not_configured";

export type SourceGovernance = {
  owner: string;
  permissionBasis: string;
  permissionReviewedOn: string | null;
  allowedFields: readonly string[];
  cadence: "twice_weekly" | "manual" | "disabled";
  crawlDelayMs: number;
  expectedRows: { min: number; max: number } | null;
  freshnessThresholdHours: number | null;
  killSwitchEnv: string | null;
  automationState: SourceAutomationState;
};

export type IngestionSource = {
  id: string;
  /** Matches competitions.source when applicable. */
  competitionSource?:
    | "tla_scrape"
    | "cca_scrape"
    | "onlinereg_scrape"
    | "chess_results_scrape"
    | "fide_calendar_scrape"
    | "tca_scrape"
    | "tabroom_scrape"
    | "vex_events_scrape"
    | "taea_vase_scrape"
    | "bennington_writers_scrape"
    | "doe_science_bowl_scrape"
    | "afsa_essay_scrape"
    | "uil_theatre_scrape"
    | "uil_speech_debate_scrape"
    | "purple_comet_scrape"
    | "uil_music_marching_scrape"
    | "txsef_scrape"
    | "congressional_app_challenge_scrape"
    | "hack_club_hackathons_scrape";
  category: Exclude<CompetitionCategory, "other">;
  name: string;
  href: string;
  logoUrl: string;
  blurb: string;
  status: IngestionSourceStatus;
  governance: SourceGovernance;
};

const INGESTION_SOURCE_PRESENTATION: Omit<
  IngestionSource,
  "governance"
>[] = [
  {
    id: "tla_scrape",
    competitionSource: "tla_scrape",
    name: "US Chess (TLA)",
    href: "https://new.uschess.org/upcoming-tournaments",
    logoUrl: "/sources/uschess.svg",
    blurb: "Official USCF-rated tournament directory.",
    status: "live",
    category: "chess",
  },
  {
    id: "cca_scrape",
    competitionSource: "cca_scrape",
    name: "Continental Chess (CCA)",
    href: "https://www.chesstour.com/refs.html",
    logoUrl: "/sources/cca.svg",
    blurb: "Major US opens — World Open, National Chess Congress, and more.",
    status: "live",
    category: "chess",
  },
  {
    id: "onlinereg_scrape",
    competitionSource: "onlinereg_scrape",
    name: "OnlineRegistration.cc",
    href: "https://onlineregistration.cc/tournaments/index.php",
    logoUrl: "/sources/onlinereg.svg",
    blurb: "Organizer registration hub used by many US events.",
    status: "live",
    category: "chess",
  },
  {
    id: "chess_results_scrape",
    competitionSource: "chess_results_scrape",
    name: "Chess-Results.com",
    href: "https://chess-results.com",
    logoUrl: "/sources/chess-results.svg",
    blurb:
      "Global pairings and results (Swiss-Manager). Causey indexes USA upcoming OTB events.",
    status: "live",
    category: "chess",
  },
  {
    id: "fide_calendar_scrape",
    competitionSource: "fide_calendar_scrape",
    name: "FIDE Calendar",
    href: "https://calendar.fide.com/calendar.php",
    logoUrl: "/sources/fide.svg",
    blurb:
      "Official international calendar — World events, Circuit, Continental stages.",
    status: "live",
    category: "chess",
  },
  {
    id: "tca_scrape",
    competitionSource: "tca_scrape",
    name: "Texas Chess Association",
    href: "https://texaschess.org/tca-and-tca-club-events/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Texas state-affiliate and club tournament announcements, with organizer pictures.",
    status: "live",
    category: "chess",
  },
  {
    id: "state_affiliates",
    name: "USCF state affiliates",
    href: "/sources/state-affiliates",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "All 50 states + DC — scholastic qualifiers and state championships. Opens a full directory.",
    status: "soon",
    category: "chess",
  },
  {
    id: "tabroom_scrape",
    competitionSource: "tabroom_scrape",
    name: "Tabroom",
    href: "https://www.tabroom.com/index/index.mhtml",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Reference link only. Primary Tabroom listings are archived; automated access and public reuse require written NSDA permission.",
    status: "soon",
    category: "debate",
  },
  {
    id: "vex_events_scrape",
    competitionSource: "vex_events_scrape",
    name: "VEX Events",
    href: "https://events.vex.com/robot-competitions/vex-robotics-competition",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official public VEX robotics event directory. Ordinary requests still hit a Cloudflare challenge (HTTP 403); Causey does not bypass that.",
    status: "soon",
    category: "stem",
  },
  {
    id: "doe_science_bowl_scrape",
    competitionSource: "doe_science_bowl_scrape",
    name: "DOE National Science Bowl",
    href: "https://science.osti.gov/wdts/nsb/Key-Dates",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official national-event dates from the Office of Science Key Dates page. Regional qualifying bowls are not indexed.",
    status: "live",
    category: "stem",
  },
  {
    id: "purple_comet_scrape",
    competitionSource: "purple_comet_scrape",
    name: "Purple Comet! Math Meet",
    href: "https://www.purplecomet.org/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official international online team mathematics contest window for middle- and high-school students.",
    status: "live",
    category: "stem",
  },
  {
    id: "txsef_scrape",
    competitionSource: "txsef_scrape",
    name: "Texas Science & Engineering Fair",
    href: "https://txsef.tamu.edu/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official Texas A&M state science-fair dates for grades 6–12 regional finalists.",
    status: "live",
    category: "stem",
  },
  {
    id: "congressional_app_challenge_scrape",
    competitionSource: "congressional_app_challenge_scrape",
    name: "Congressional App Challenge",
    href: "https://www.congressionalappchallenge.us/students/participating-districts/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official national student app-submission window. Causey indexes one year-specific cycle, not a row per congressional district.",
    status: "live",
    category: "stem",
  },
  {
    id: "hack_club_hackathons_scrape",
    competitionSource: "hack_club_hackathons_scrape",
    name: "Hack Club Hackathons",
    href: "https://hackathons.hackclub.com/",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Documented high-school hackathon JSON directory. Causey indexes virtual events and US in-person rows and credits Hack Club Hackathons. Logos are not stored.",
    status: "live",
    category: "stem",
  },
  {
    id: "taea_vase_scrape",
    competitionSource: "taea_vase_scrape",
    name: "TAEA VASE",
    href: "https://www.taea.org/vase/directors-dates.asp",
    logoUrl: "/sources/state-affiliates.svg",
    blurb: "Official public Visual Arts Scholastic Event dates.",
    status: "live",
    category: "arts",
  },
  {
    id: "uil_theatre_scrape",
    competitionSource: "uil_theatre_scrape",
    name: "UIL Theatre State Meets",
    href: "https://www.uiltexas.org/theatre/state",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official high-school theatre state-meet dates. Regional, district, zone, and local coverage is not included.",
    status: "live",
    category: "arts",
  },
  {
    id: "uil_music_marching_scrape",
    competitionSource: "uil_music_marching_scrape",
    name: "UIL State Open Class Marching Band",
    href: "https://www.uiltexas.org/music/marching-band/state",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official state open-class marching band dates by conference group at the Alamodome. Other UIL music levels and contests are not included.",
    status: "live",
    category: "arts",
  },
  {
    id: "uil_speech_debate_scrape",
    competitionSource: "uil_speech_debate_scrape",
    name: "UIL Speech & Debate Invitationals",
    href: "https://www.uiltexas.org/academics/invitational-meets-test",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official UIL invitational calendar rows with explicit speech/debate offerings, exact dates, and complete Texas locations.",
    status: "live",
    category: "debate",
  },
  {
    id: "bennington_writers_scrape",
    competitionSource: "bennington_writers_scrape",
    name: "Bennington Young Writers Awards",
    href: "https://www.bennington.edu/events/young-writers-awards",
    logoUrl: "/sources/state-affiliates.svg",
    blurb: "Official public high-school writing award page.",
    status: "live",
    category: "writing",
  },
  {
    id: "afsa_essay_scrape",
    competitionSource: "afsa_essay_scrape",
    name: "AFSA National High School Essay Contest",
    href: "https://afsa.org/essay-contest",
    logoUrl: "/sources/state-affiliates.svg",
    blurb:
      "Official essay-contest cycles with exact AFSA-published deadlines and open or closed status.",
    status: "live",
    category: "writing",
  },
];

const FACTUAL_LISTING_FIELDS = [
  "source identity",
  "canonical official URL",
  "dates and published status",
  "category and facets",
  "explicit online status or published location",
  "published eligibility and fee fields",
] as const;

const OWNER = "Causey data operations";
const REVIEWED_2026_08_13 = "2026-08-13";
const REVIEWED_2026_09_02 = "2026-09-02";
const REVIEWED_2026_09_06 = "2026-09-06";

function enabledGovernance(
  permissionBasis: string,
  expectedRows: { min: number; max: number } | null,
  options: {
    permissionReviewedOn?: string | null;
    crawlDelayMs?: number;
    freshnessThresholdHours?: number;
  } = {}
): SourceGovernance {
  return {
    owner: OWNER,
    permissionBasis,
    permissionReviewedOn: options.permissionReviewedOn ?? null,
    allowedFields: FACTUAL_LISTING_FIELDS,
    cadence: "twice_weekly",
    crawlDelayMs: options.crawlDelayMs ?? 350,
    expectedRows,
    freshnessThresholdHours: options.freshnessThresholdHours ?? 192,
    killSwitchEnv: null,
    automationState: "enabled",
  };
}

const SOURCE_GOVERNANCE: Record<string, SourceGovernance> = {
  tla_scrape: enabledGovernance(
    "Existing official US Chess public tournament listing workflow; production-use review remains an operations responsibility.",
    null
  ),
  cca_scrape: enabledGovernance(
    "Existing organizer public event-page workflow; production-use review remains an operations responsibility.",
    null
  ),
  onlinereg_scrape: enabledGovernance(
    "Existing public registration-directory workflow; factual listing metadata only.",
    null
  ),
  chess_results_scrape: enabledGovernance(
    "Existing public results-directory workflow; upcoming USA event metadata only.",
    null
  ),
  fide_calendar_scrape: enabledGovernance(
    "Existing official public calendar workflow; factual event metadata only.",
    null
  ),
  tca_scrape: enabledGovernance(
    "Existing official Texas affiliate public event-page workflow.",
    null
  ),
  state_affiliates: {
    owner: OWNER,
    permissionBasis: "Outbound reference directory only; no automated ingestion.",
    permissionReviewedOn: null,
    allowedFields: [],
    cadence: "disabled",
    crawlDelayMs: 0,
    expectedRows: null,
    freshnessThresholdHours: null,
    killSwitchEnv: null,
    automationState: "reference",
  },
  tabroom_scrape: {
    owner: OWNER,
    permissionBasis:
      "Paused: NSDA terms prohibit automated access and commercial/public reuse without written permission.",
    permissionReviewedOn: REVIEWED_2026_08_13,
    allowedFields: [],
    cadence: "disabled",
    crawlDelayMs: 0,
    expectedRows: null,
    freshnessThresholdHours: null,
    killSwitchEnv: null,
    automationState: "paused",
  },
  vex_events_scrape: {
    owner: OWNER,
    permissionBasis:
      "Ordinary public HTML still returns HTTP 403 (Cloudflare challenge). Causey will not bypass that or use a private API.",
    permissionReviewedOn: REVIEWED_2026_09_02,
    allowedFields: FACTUAL_LISTING_FIELDS,
    cadence: "manual",
    crawlDelayMs: 350,
    expectedRows: null,
    freshnessThresholdHours: null,
    killSwitchEnv: null,
    automationState: "blocked",
  },
  taea_vase_scrape: enabledGovernance(
    "First-party public directors’ dates and state overview; factual event metadata only.",
    { min: 1, max: 30 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  bennington_writers_scrape: enabledGovernance(
    "First-party public award page; rows require an exact year-specific cycle.",
    { min: 0, max: 1 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  doe_science_bowl_scrape: enabledGovernance(
    "Office of Science robots.txt allows Key Dates and About; Web Policies mark site materials public domain with source acknowledgment and no implied endorsement. Ordinary public HTML returned HTTP 200 on 2026-09-02.",
    { min: 1, max: 8 },
    { permissionReviewedOn: REVIEWED_2026_09_02 }
  ),
  afsa_essay_scrape: enabledGovernance(
    "First-party public contest pages; conditions reviewed without an applicable automation or commercial-use prohibition.",
    { min: 0, max: 2 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  uil_theatre_scrape: enabledGovernance(
    "First-party ordinary HTML allowed by robots.txt; disallowed linked files are never fetched.",
    { min: 1, max: 6 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  uil_speech_debate_scrape: enabledGovernance(
    "First-party ordinary HTML allowed by robots.txt; third-party registration pages and disallowed files are excluded.",
    { min: 1, max: 100 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  purple_comet_scrape: enabledGovernance(
    "First-party public pages allowed by robots.txt; protected problems, login content, and participant data are excluded.",
    { min: 1, max: 2 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  uil_music_marching_scrape: enabledGovernance(
    "First-party ordinary HTML allowed by robots.txt; disallowed linked files are never fetched.",
    { min: 1, max: 12 },
    { permissionReviewedOn: REVIEWED_2026_08_13 }
  ),
  txsef_scrape: enabledGovernance(
    "First-party public Texas A&M HTML and attributed factual metadata under the published linking policy.",
    { min: 1, max: 2 },
    {
      permissionReviewedOn: REVIEWED_2026_08_13,
      crawlDelayMs: 10_000,
    }
  ),
  congressional_app_challenge_scrape: enabledGovernance(
    "First-party public HTML allowed by robots.txt except /wp-admin/; reviewed 2026-09-06 with no applicable automation or commercial-use prohibition. One national submission window only; participating-district tables, PDFs, and registration portals are excluded.",
    { min: 1, max: 1 },
    { permissionReviewedOn: REVIEWED_2026_09_06 }
  ),
  hack_club_hackathons_scrape: enabledGovernance(
    "Documented public JSON API. API docs require crediting Hack Club Hackathons with a link. Subdomain robots.txt is absent; hackclub.com allows /. Virtual events plus US in-person/hybrid rows only. Logos and banners are excluded.",
    { min: 1, max: 80 },
    { permissionReviewedOn: REVIEWED_2026_09_06 }
  ),
};

export const INGESTION_SOURCES: IngestionSource[] =
  INGESTION_SOURCE_PRESENTATION.map((source) => {
    const governance =
      SOURCE_GOVERNANCE[source.id] ?? {
        owner: OWNER,
        permissionBasis: "No automated ingestion permission basis recorded.",
        permissionReviewedOn: null,
        allowedFields: [],
        cadence: "disabled",
        crawlDelayMs: 0,
        expectedRows: null,
        freshnessThresholdHours: null,
        killSwitchEnv: null,
        automationState: "reference",
      } satisfies SourceGovernance;
    return {
      ...source,
      governance: {
        ...governance,
        killSwitchEnv:
          governance.automationState === "enabled"
            ? sourceAutomationKillSwitch(source.id)
            : null,
      },
    };
  });

export type SourceHealth = {
  sourceId: string;
  state: SourceHealthState;
  message: string;
  lastSuccessAt: string | null;
};

export type SourceHealthRun = {
  source: string;
  status: "running" | "succeeded" | "failed";
  started_at: string;
  finished_at: string | null;
  rows_staged?: number | null;
};

export function sourceNeedsOperationalAttention(
  source: IngestionSource,
  health: SourceHealth
): boolean {
  return (
    source.governance.automationState === "enabled" &&
    health.state !== "healthy"
  );
}

export function sourceAutomationKillSwitch(sourceId: string): string {
  return `SCRAPE_DISABLE_${sourceId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

export function assertSourceAutomationAllowed(
  sourceId: string,
  env: Readonly<Record<string, string | undefined>> = process.env
): IngestionSource {
  const source = sourceById(sourceId);
  if (!source) throw new Error(`Unknown ingestion source: ${sourceId}`);
  const state = source.governance.automationState;
  if (
    sourceId === "tabroom_scrape" &&
    state === "paused" &&
    env.TABROOM_WRITTEN_PERMISSION === "1"
  ) {
    return source;
  }
  if (state !== "enabled") {
    throw new Error(
      `${source.name} automation is ${state}; refusing to fetch or publish.`
    );
  }
  const killSwitch = source.governance.killSwitchEnv;
  if (killSwitch && env[killSwitch] === "1") {
    throw new Error(`${source.name} is disabled by ${killSwitch}.`);
  }
  return source;
}

export function evaluateSourceBatchHealth(input: {
  sourceId: string;
  rows: number;
  previousRows?: number | null;
}): SourceHealth {
  const source = sourceById(input.sourceId);
  if (!source) {
    return {
      sourceId: input.sourceId,
      state: "failing",
      message: "Source metadata is missing.",
      lastSuccessAt: null,
    };
  }
  const expected = source.governance.expectedRows;
  if (input.rows === 0 && expected?.min === 0) {
    return {
      sourceId: source.id,
      state: "warning",
      message: "Zero rows are allowed for this source, but require review.",
      lastSuccessAt: null,
    };
  }
  if (
    expected &&
    (input.rows < expected.min || input.rows > expected.max)
  ) {
    return {
      sourceId: source.id,
      state: "failing",
      message: `Row count ${input.rows} is outside expected range ${expected.min}–${expected.max}.`,
      lastSuccessAt: null,
    };
  }
  if (
    expected &&
    input.previousRows &&
    input.previousRows >= 4 &&
    Math.abs(input.rows - input.previousRows) / input.previousRows > 0.75
  ) {
    return {
      sourceId: source.id,
      state: "failing",
      message: `Row count changed abnormally from ${input.previousRows} to ${input.rows}.`,
      lastSuccessAt: null,
    };
  }
  return {
    sourceId: source.id,
    state: "healthy",
    message: `${input.rows} row(s) passed the source count gate.`,
    lastSuccessAt: null,
  };
}

export function assertSourceBatchHealthy(input: {
  sourceId: string;
  rows: number;
  previousRows?: number | null;
}): SourceHealth {
  const health = evaluateSourceBatchHealth(input);
  if (health.state === "failing") throw new Error(health.message);
  return health;
}

export function evaluateSourceOperationalHealth(
  source: IngestionSource,
  runs: readonly SourceHealthRun[],
  now = new Date()
): SourceHealth {
  const automation = source.governance.automationState;
  if (automation === "paused" || automation === "blocked") {
    return {
      sourceId: source.id,
      state: automation,
      message: source.governance.permissionBasis,
      lastSuccessAt: null,
    };
  }
  if (automation !== "enabled") {
    return {
      sourceId: source.id,
      state: "not_configured",
      message: "Reference-only source; no automated health expected.",
      lastSuccessAt: null,
    };
  }
  const sourceRuns = runs
    .filter((run) => run.source === source.competitionSource)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
  const latest = sourceRuns[0];
  const success = sourceRuns.find((run) => run.status === "succeeded");
  if (!success) {
    return {
      sourceId: source.id,
      state: latest?.status === "failed" ? "failing" : "not_configured",
      message: latest?.status === "failed"
        ? "The latest parser or persistence run failed."
        : "No successful run is recorded.",
      lastSuccessAt: null,
    };
  }
  if (latest?.status === "failed" && latest.started_at > success.started_at) {
    return {
      sourceId: source.id,
      state: "failing",
      message: "The latest parser or persistence run failed.",
      lastSuccessAt: success.finished_at ?? success.started_at,
    };
  }
  const lastSuccessAt = success.finished_at ?? success.started_at;
  const threshold = source.governance.freshnessThresholdHours;
  if (
    threshold !== null &&
    now.getTime() - new Date(lastSuccessAt).getTime() >
      threshold * 60 * 60 * 1000
  ) {
    return {
      sourceId: source.id,
      state: "warning",
      message: `No successful refresh within ${threshold} hours.`,
      lastSuccessAt,
    };
  }
  return {
    sourceId: source.id,
    state: "healthy",
    message: "The latest governed run succeeded within its freshness window.",
    lastSuccessAt,
  };
}

export function sourceByCompetitionSource(
  source: string
): IngestionSource | undefined {
  return INGESTION_SOURCES.find((s) => s.competitionSource === source);
}

export function sourceById(id: string): IngestionSource | undefined {
  return INGESTION_SOURCES.find((s) => s.id === id);
}

/** Plain-language filter options for competitions.source (search + admin). */
export const COMPETITION_SOURCE_FILTER_OPTIONS: {
  value: string;
  label: string;
}[] = [
  ...INGESTION_SOURCES.filter(
    (s) => s.competitionSource && s.status === "live"
  ).map((s) => ({
    value: s.competitionSource as string,
    label: s.name,
  })),
  { value: "organizer", label: "Provided by organizer" },
  { value: "manual", label: "Entered in Causey" },
];

export function competitionSourceLabel(source: string): string {
  return (
    COMPETITION_SOURCE_FILTER_OPTIONS.find((s) => s.value === source)?.label ??
    source
  );
}

export function isCompetitionSourceFilter(source: string): boolean {
  return COMPETITION_SOURCE_FILTER_OPTIONS.some((s) => s.value === source);
}

export function competitionSourceOptionsForCategory(
  category: CompetitionCategory
): { value: string; label: string }[] {
  return [
    ...INGESTION_SOURCES.filter(
      (source) =>
        source.category === category &&
        source.competitionSource &&
        source.status === "live"
    ).map((source) => ({
      value: source.competitionSource as string,
      label: source.name,
    })),
    { value: "organizer", label: "Provided by organizer" },
    { value: "manual", label: "Entered in Causey" },
  ];
}
