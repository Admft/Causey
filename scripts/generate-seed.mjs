/**
 * Seed-data generator. Run with `npm run seed:generate` — writes
 * /data/seed/*.json and /data/zips.sample.json.
 *
 * ⚠️ EVERYTHING THIS PRODUCES IS ILLUSTRATIVE SEED DATA, clearly patterned on
 * how US scholastic chess actually works (section structures, fee ranges,
 * state championships, the Denker/Barber/Rockefeller/Haring invitational
 * chain) but with invented venues and dates. The qualification_rules in
 * particular are PLAUSIBLE SCAFFOLDING, NOT VERIFIED TRUTH — see SETUP.md
 * step 6: every rule must be replaced with a cited, current rule from
 * official US Chess announcements before launch.
 *
 * The generated JSON is committed so the app never needs to run this script;
 * edit the tables below and re-run only when you want different seed data.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Deterministic, valid UUIDv4-format ids so seed rows are stable across runs
// and easy to cross-reference by eye.
// ---------------------------------------------------------------------------
const uuid = (tail) => `00000000-0000-4000-8000-${tail.padStart(12, "0")}`;
const seriesId = (n) => uuid(`01${String(n).padStart(2, "0")}`);
const compId = (n) => uuid(`02${String(n).padStart(3, "0")}`);
const sectionId = (comp, sec) =>
  uuid(`03${String(comp).padStart(3, "0")}${String(sec).padStart(2, "0")}`);
const ruleId = (n) => uuid(`04${String(n).padStart(2, "0")}`);

// ---------------------------------------------------------------------------
// Zip → lat/lng sample (real US zips, city-center coordinates). The full
// ~42k-row dataset gets loaded into the `zips` table in production; this
// sample covers every seeded city plus a few residential zips for demos.
// ---------------------------------------------------------------------------
const ZIPS = {
  // Texas
  75201: [32.7876, -96.7994], // Dallas
  75074: [33.0198, -96.6989], // Plano
  75080: [32.9483, -96.7299], // Richardson (residential demo zip)
  76102: [32.7555, -97.3308], // Fort Worth
  77002: [29.7563, -95.3654], // Houston
  78701: [30.2711, -97.7437], // Austin
  78205: [29.4241, -98.4936], // San Antonio
  78501: [26.2034, -98.23], // McAllen
  79901: [31.7587, -106.4869], // El Paso
  // New York
  10001: [40.7506, -73.9971], // Manhattan
  10011: [40.742, -74.0], // Manhattan (Chelsea/Village)
  11201: [40.6955, -73.9895], // Brooklyn
  11375: [40.7209, -73.8458], // Forest Hills (residential demo zip)
  10601: [41.033, -73.7629], // White Plains
  12866: [43.0831, -73.7846], // Saratoga Springs
  14202: [42.8864, -78.8784], // Buffalo
  // California
  90012: [34.0614, -118.2385], // Los Angeles
  90210: [34.0901, -118.4065], // Beverly Hills (residential demo zip)
  92101: [32.7157, -117.1611], // San Diego
  92270: [33.7397, -116.4128], // Rancho Mirage
  93721: [36.7378, -119.7871], // Fresno
  94704: [37.8664, -122.2564], // Berkeley
  95050: [37.3541, -121.9552], // Santa Clara
  95814: [38.5816, -121.4944], // Sacramento
  // Illinois
  60602: [41.8837, -87.6289], // Chicago Loop
  60614: [41.9227, -87.6533], // Chicago Lincoln Park (residential demo zip)
  60201: [42.0451, -87.6877], // Evanston
  60540: [41.7508, -88.1535], // Naperville
  62701: [39.799, -89.644], // Springfield
  // New Jersey
  "07102": [40.7357, -74.1724], // Newark
  "07960": [40.7968, -74.4815], // Morristown
  "08540": [40.3573, -74.6672], // Princeton
  "08002": [39.9268, -75.0246], // Cherry Hill
  // Florida
  33130: [25.769, -80.2032], // Miami
  32801: [28.5384, -81.3789], // Orlando
  33602: [27.9506, -82.4572], // Tampa
  32202: [30.3322, -81.6557], // Jacksonville
  // Arizona
  85004: [33.4484, -112.074], // Phoenix
  85701: [32.2226, -110.9747], // Tucson
  85201: [33.4152, -111.8315], // Mesa
  // Missouri
  63101: [38.627, -90.1994], // St. Louis downtown
  63108: [38.6446, -90.2611], // St. Louis Central West End
  64106: [39.0997, -94.5786], // Kansas City
  65201: [38.9517, -92.3341], // Columbia
};

// ---------------------------------------------------------------------------
// Series. Rules key on these, not on year-instances, so the qualification
// graph survives year over year.
// ---------------------------------------------------------------------------
const SERIES = [
  { n: 1, name: "Denker Tournament of High School Champions", level: "national" },
  { n: 2, name: "Barber Tournament of K-8 Champions", level: "national" },
  { n: 3, name: "Rockefeller Tournament of K-5 Champions", level: "national" },
  { n: 4, name: "Haring Tournament of Girls State Champions", level: "national" },
  { n: 5, name: "U.S. Junior Championship", level: "national" },
  { n: 6, name: "Texas Scholastic Championship", level: "state" },
  { n: 7, name: "New York State Scholastic Championship", level: "state" },
  { n: 8, name: "CalChess State Scholastic Championship", level: "state" },
  { n: 9, name: "Illinois K-12 State Championship", level: "state" },
  { n: 10, name: "New Jersey State Scholastic Championship", level: "state" },
  { n: 11, name: "North Texas Scholastic Regional", level: "local" },
  { n: 12, name: "Chicago Scholastic Championship Series", level: "local" },
];

// ---------------------------------------------------------------------------
// Section templates. Grades: 0 = Kindergarten … 12. A field left undefined
// becomes null (open). `fee` overrides the competition-level entry fee.
// ---------------------------------------------------------------------------
const s = (name, extra = {}) => ({ name, ...extra });

const TEMPLATES = {
  // Typical full weekend scholastic open: championship plus rating-banded
  // reserve sections and an unrated section.
  scholasticFull: () => [
    s("K-12 Championship", { min_grade: 0, max_grade: 12 }),
    s("K-8 U1200", { min_grade: 0, max_grade: 8, max_rating: 1199 }),
    s("K-6 U1000", { min_grade: 0, max_grade: 6, max_rating: 999 }),
    s("K-3 U600", { min_grade: 0, max_grade: 3, max_rating: 599 }),
    s("K-12 Unrated", { min_grade: 0, max_grade: 12 }),
  ],
  // Smaller community scholastic capped at K-8.
  scholasticK8: () => [
    s("K-8 Championship", { min_grade: 0, max_grade: 8 }),
    s("K-8 U1000", { min_grade: 0, max_grade: 8, max_rating: 999 }),
    s("K-5 U800", { min_grade: 0, max_grade: 5, max_rating: 799 }),
    s("K-8 Unrated", { min_grade: 0, max_grade: 8 }),
  ],
  // High-school-only open.
  hsOpen: () => [
    s("Championship (9-12)", { min_grade: 9, max_grade: 12 }),
    s("U1600 (9-12)", { min_grade: 9, max_grade: 12, max_rating: 1599 }),
    s("U1200 (9-12)", { min_grade: 9, max_grade: 12, max_rating: 1199 }),
    s("Novice U800 (9-12)", { min_grade: 9, max_grade: 12, max_rating: 799 }),
  ],
  // Regional qualifier structure (feeds a state championship in the seeded
  // qualification graph).
  regional: () => [
    s("Championship (K-12)", { min_grade: 0, max_grade: 12 }),
    s("K-8 U1200", { min_grade: 0, max_grade: 8, max_rating: 1199 }),
    s("K-5 U900", { min_grade: 0, max_grade: 5, max_rating: 899 }),
    s("Unrated (K-12)", { min_grade: 0, max_grade: 12 }),
  ],
  // State scholastic championship: championship sections are residency-
  // restricted (like real state championships) and the HS section carries a
  // higher section-level fee to exercise the fee-override path.
  stateChamp: (state) => [
    s("High School Championship (9-12)", {
      min_grade: 9,
      max_grade: 12,
      residency_state: state,
      fee: 1000, // added to nothing — this REPLACES the event fee, set below
    }),
    s("K-8 Championship", { min_grade: 0, max_grade: 8, residency_state: state }),
    s("K-5 Championship", { min_grade: 0, max_grade: 5, residency_state: state }),
    s("Girls Championship (K-12)", {
      min_grade: 0,
      max_grade: 12,
      gender_restriction: "girls",
      residency_state: state,
    }),
    s("K-12 U1200 Reserve", { min_grade: 0, max_grade: 12, max_rating: 1199 }),
  ],
  // Girls-only open (not an invitational — an open event restricted to girls).
  girlsOpen: () => [
    s("Girls Championship (K-12)", { min_grade: 0, max_grade: 12, gender_restriction: "girls" }),
    s("Girls K-8 U1000", { min_grade: 0, max_grade: 8, max_rating: 999, gender_restriction: "girls" }),
    s("Girls K-5 U600", { min_grade: 0, max_grade: 5, max_rating: 599, gender_restriction: "girls" }),
  ],
  // Club quads: small rated round-robins.
  quads: () => [
    s("Open Quads (K-12)", { min_grade: 0, max_grade: 12 }),
    s("U1000 Quads (K-8)", { min_grade: 0, max_grade: 8, max_rating: 999 }),
    s("Unrated Quads (K-6)", { min_grade: 0, max_grade: 6 }),
  ],
  // Age-capped event (exercises min_age/max_age eligibility).
  cadet: () => [
    s("Cadet Championship (Under 16)", { max_age: 15 }),
    s("Cadet U1200 (Under 16)", { max_age: 15, max_rating: 1199 }),
    s("Cadet Novice U800 (Under 16)", { max_age: 15, max_rating: 799 }),
  ],
  // National invitationals: one championship section, entry by invitation.
  denker: () => [s("Championship (state HS champions)", { min_grade: 9, max_grade: 12 })],
  barber: () => [s("Championship (state K-8 champions)", { min_grade: 0, max_grade: 8 })],
  rockefeller: () => [s("Championship (state K-5 champions)", { min_grade: 0, max_grade: 5 })],
  haring: () => [
    s("Championship (state girls champions)", {
      min_grade: 0,
      max_grade: 12,
      gender_restriction: "girls",
    }),
  ],
  usJunior: () => [s("Championship (invitational, under 21)", { max_age: 20 })],
};

// Real registration platforms / affiliate sites, pointed at their homepages:
// seed events are illustrative, so we never fabricate a deep listing URL.
const REG = {
  caissa: "https://caissachess.net",
  king: "https://www.kingregistration.com",
  tca: "https://www.texaschess.org",
  nysca: "https://www.nysca.net",
  calchess: "https://calchess.org",
  ica: "https://il-chess.org",
  njscf: "https://www.njscf.org",
  uschess: "https://new.uschess.org",
};

// ---------------------------------------------------------------------------
// Competitions. Dates run Aug 2026 – Jan 2027 (the ~6 months after seed
// creation). days = event length; deadline = 5 days before start.
// ---------------------------------------------------------------------------
const C = (o) => o;
const COMPETITIONS = [
  // --- Texas ---------------------------------------------------------------
  C({ slug: "houston-open-scholastic-2026", name: "Houston Open Scholastic", org: "Houston Scholastic Chess League", venue: "Westside High School", addr: "14201 Briar Forest Dr", city: "Houston", state: "TX", zip: "77002", start: "2026-08-22", fee: 2500, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "dallas-fall-scholastic-open-2026", name: "Dallas Fall Scholastic Open", org: "Dallas Chess Alliance", venue: "Conrad Learning Center", addr: "7502 Fair Oaks Ave", city: "Dallas", state: "TX", zip: "75201", start: "2026-09-12", fee: 3000, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "el-paso-scholastic-open-2026", name: "El Paso Scholastic Open", org: "Sun City Chess Club", venue: "El Paso Community College, Valle Verde Campus", addr: "919 Hunter Dr", city: "El Paso", state: "TX", zip: "79901", start: "2026-09-26", fee: 2500, t: "scholasticK8", reg: REG.king }),
  C({ slug: "north-texas-scholastic-regional-2026", name: "North Texas Scholastic Regional", org: "Texas Chess Association", venue: "Plano Event Center", addr: "2000 E Spring Creek Pkwy", city: "Plano", state: "TX", zip: "75074", start: "2026-10-17", fee: 4500, t: "regional", series: 11, reg: REG.tca }),
  C({ slug: "austin-city-scholastic-championship-2026", name: "Austin City Scholastic Championship", org: "Austin Scholastic Chess", venue: "Palmer Events Center", addr: "900 Barton Springs Rd", city: "Austin", state: "TX", zip: "78701", start: "2026-11-07", fee: 3500, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "lone-star-open-scholastic-2026", name: "Lone Star Open Scholastic", org: "Fort Worth Chess Center", venue: "Fort Worth Convention Center", addr: "1201 Houston St", city: "Fort Worth", state: "TX", zip: "76102", start: "2026-12-05", fee: 4000, t: "scholasticFull", reg: REG.king }),
  C({ slug: "plano-winter-scholastic-2026", name: "Plano Winter Scholastic", org: "Plano Chess Club", venue: "Carpenter Middle School", addr: "3905 Rainier Rd", city: "Plano", state: "TX", zip: "75074", start: "2026-12-12", fee: 3000, t: "scholasticK8", reg: REG.caissa }),
  C({ slug: "rio-grande-valley-scholastic-2026", name: "Rio Grande Valley Scholastic", org: "RGV Chess Educators", venue: "McAllen Convention Center", addr: "700 Convention Center Blvd", city: "McAllen", state: "TX", zip: "78501", start: "2027-01-16", fee: 2000, t: "scholasticK8", reg: REG.king }),
  C({ slug: "texas-scholastic-championship-2027", name: "Texas Scholastic Championship 2027", org: "Texas Chess Association", venue: "Henry B. González Convention Center", addr: "900 E Market St", city: "San Antonio", state: "TX", zip: "78205", start: "2027-01-30", days: 2, fee: 6500, t: "stateChamp", tArg: "TX", series: 6, reg: REG.tca }),

  // --- New York ------------------------------------------------------------
  C({ slug: "brooklyn-scholastic-open-2026", name: "Brooklyn Scholastic Open", org: "Brooklyn Chess Academy", venue: "Brooklyn Marriott", addr: "333 Adams St", city: "Brooklyn", state: "NY", zip: "11201", start: "2026-09-19", fee: 2500, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "manhattan-fall-scholastic-2026", name: "Manhattan Fall Scholastic", org: "Chess-in-the-Schools", venue: "Fashion Institute of Technology", addr: "227 W 27th St", city: "New York", state: "NY", zip: "10011", start: "2026-10-03", fee: 3500, t: "scholasticFull", reg: REG.king }),
  C({ slug: "westchester-fall-scholastic-2026", name: "Westchester Fall Scholastic", org: "Westchester Chess Club", venue: "White Plains High School", addr: "550 North St", city: "White Plains", state: "NY", zip: "10601", start: "2026-10-24", fee: 3000, t: "scholasticK8", reg: REG.caissa }),
  C({ slug: "buffalo-niagara-scholastic-2026", name: "Buffalo Niagara Scholastic", org: "Buffalo Chess Society", venue: "Buffalo Convention Center", addr: "153 Franklin St", city: "Buffalo", state: "NY", zip: "14202", start: "2026-11-14", fee: 2500, t: "scholasticK8", reg: REG.king }),
  C({ slug: "new-york-girls-scholastic-open-2026", name: "New York Girls Scholastic Open", org: "NYC Girls Chess Initiative", venue: "Hotel Pennsylvania Annex", addr: "401 Seventh Ave", city: "New York", state: "NY", zip: "10001", start: "2026-11-21", fee: 2000, t: "girlsOpen", reg: REG.caissa }),
  C({ slug: "new-york-state-scholastic-championship-2027", name: "New York State Scholastic Championship 2027", org: "New York State Chess Association", venue: "Saratoga Springs City Center", addr: "522 Broadway", city: "Saratoga Springs", state: "NY", zip: "12866", start: "2027-01-16", days: 2, fee: 7000, t: "stateChamp", tArg: "NY", series: 7, reg: REG.nysca }),

  // --- California ----------------------------------------------------------
  C({ slug: "bay-area-scholastic-open-2026", name: "Bay Area Scholastic Open", org: "Bay Area Chess", venue: "Santa Clara Convention Center", addr: "5001 Great America Pkwy", city: "Santa Clara", state: "CA", zip: "95050", start: "2026-08-29", fee: 3500, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "los-angeles-scholastic-classic-2026", name: "Los Angeles Scholastic Classic", org: "LA Scholastic Chess Foundation", venue: "LA Convention Center, Petree Hall", addr: "1201 S Figueroa St", city: "Los Angeles", state: "CA", zip: "90012", start: "2026-09-05", fee: 3000, t: "scholasticFull", reg: REG.king }),
  C({ slug: "berkeley-scholastic-quads-2026", name: "Berkeley Scholastic Quads", org: "Berkeley Chess School", venue: "Berkeley Chess School", addr: "2622 San Pablo Ave", city: "Berkeley", state: "CA", zip: "94704", start: "2026-09-13", fee: 2000, t: "quads", reg: REG.calchess }),
  C({ slug: "san-diego-scholastic-open-2026", name: "San Diego Scholastic Open", org: "San Diego Chess Club", venue: "Balboa Park Activity Center", addr: "2145 Park Blvd", city: "San Diego", state: "CA", zip: "92101", start: "2026-10-10", fee: 2800, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "central-valley-scholastic-2026", name: "Central Valley Scholastic", org: "Fresno Chess Federation", venue: "Fresno Convention Center", addr: "848 M St", city: "Fresno", state: "CA", zip: "93721", start: "2026-11-14", fee: 2500, t: "scholasticK8", reg: REG.king }),
  C({ slug: "sacramento-winter-scholastic-2026", name: "Sacramento Winter Scholastic", org: "Sacramento Chess Club", venue: "SAFE Credit Union Convention Center", addr: "1401 K St", city: "Sacramento", state: "CA", zip: "95814", start: "2026-12-06", fee: 3000, t: "scholasticFull", reg: REG.calchess }),
  C({ slug: "calchess-state-scholastic-championship-2027", name: "CalChess State Scholastic Championship 2027", org: "CalChess", venue: "Santa Clara Convention Center", addr: "5001 Great America Pkwy", city: "Santa Clara", state: "CA", zip: "95050", start: "2027-01-23", days: 2, fee: 7500, t: "stateChamp", tArg: "CA", series: 8, reg: REG.calchess }),

  // --- Illinois ------------------------------------------------------------
  C({ slug: "naperville-fall-scholastic-2026", name: "Naperville Fall Scholastic", org: "DuPage Chess League", venue: "Naperville Central High School", addr: "440 Aurora Ave", city: "Naperville", state: "IL", zip: "60540", start: "2026-08-30", fee: 2800, t: "scholasticK8", reg: REG.king }),
  C({ slug: "chicago-scholastic-series-fall-2026", name: "Chicago Scholastic Championship Series — Fall", org: "Illinois Chess Association", venue: "UIC Forum", addr: "725 W Roosevelt Rd", city: "Chicago", state: "IL", zip: "60602", start: "2026-09-26", fee: 3500, t: "regional", series: 12, reg: REG.ica }),
  C({ slug: "evanston-scholastic-open-2026", name: "Evanston Scholastic Open", org: "North Shore Chess Center", venue: "Evanston Township High School", addr: "1600 Dodge Ave", city: "Evanston", state: "IL", zip: "60201", start: "2026-10-04", fee: 2500, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "illinois-k12-state-championship-2026", name: "Illinois K-12 State Championship 2026", org: "Illinois Chess Association", venue: "Bank of Springfield Center", addr: "1 Convention Center Plaza", city: "Springfield", state: "IL", zip: "62701", start: "2026-11-21", days: 2, fee: 6000, t: "stateChamp", tArg: "IL", series: 9, reg: REG.ica }),
  C({ slug: "chicago-scholastic-series-winter-2027", name: "Chicago Scholastic Championship Series — Winter", org: "Illinois Chess Association", venue: "UIC Forum", addr: "725 W Roosevelt Rd", city: "Chicago", state: "IL", zip: "60602", start: "2027-01-09", fee: 3500, t: "regional", series: 12, reg: REG.ica }),

  // --- New Jersey ----------------------------------------------------------
  C({ slug: "newark-community-scholastic-2026", name: "Newark Community Scholastic", org: "Newark Chess Collective", venue: "Newark Public Library", addr: "5 Washington St", city: "Newark", state: "NJ", zip: "07102", start: "2026-09-20", fee: 1500, t: "scholasticK8", reg: REG.njscf }),
  C({ slug: "princeton-scholastic-open-2026", name: "Princeton Scholastic Open", org: "Princeton Chess Academy", venue: "Princeton Community Middle School", addr: "55 Valley Rd", city: "Princeton", state: "NJ", zip: "08540", start: "2026-10-11", fee: 3000, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "cherry-hill-winter-scholastic-2026", name: "Cherry Hill Winter Scholastic", org: "South Jersey Chess Club", venue: "Cherry Hill Mall Community Room", addr: "2000 Route 38", city: "Cherry Hill", state: "NJ", zip: "08002", start: "2026-12-13", fee: 2500, t: "scholasticK8", reg: REG.king }),
  C({ slug: "new-jersey-state-scholastic-championship-2027", name: "New Jersey State Scholastic Championship 2027", org: "New Jersey State Chess Federation", venue: "Hyatt Regency Morristown", addr: "3 Speedwell Ave", city: "Morristown", state: "NJ", zip: "07960", start: "2027-01-24", days: 2, fee: 6000, t: "stateChamp", tArg: "NJ", series: 10, reg: REG.njscf }),

  // --- Florida -------------------------------------------------------------
  C({ slug: "jacksonville-fall-scholastic-2026", name: "Jacksonville Fall Scholastic", org: "First Coast Chess Club", venue: "Prime Osborn Convention Center", addr: "1000 Water St", city: "Jacksonville", state: "FL", zip: "32202", start: "2026-08-23", fee: 2000, t: "scholasticK8", reg: REG.king }),
  C({ slug: "orlando-scholastic-open-2026", name: "Orlando Scholastic Open", org: "Central Florida Chess Club", venue: "Orange County Convention Center", addr: "9800 International Dr", city: "Orlando", state: "FL", zip: "32801", start: "2026-09-06", fee: 3000, t: "scholasticFull", reg: REG.caissa }),
  C({ slug: "miami-scholastic-championship-2026", name: "Miami Scholastic Championship", org: "Miami Chess Academy", venue: "Miami Airport Convention Centre", addr: "711 NW 72nd Ave", city: "Miami", state: "FL", zip: "33130", start: "2026-10-25", fee: 3500, t: "scholasticFull", reg: REG.king }),
  C({ slug: "tampa-bay-scholastic-2026", name: "Tampa Bay Scholastic", org: "Tampa Chess Club", venue: "Tampa Convention Center", addr: "333 S Franklin St", city: "Tampa", state: "FL", zip: "33602", start: "2026-11-08", fee: 2500, t: "scholasticK8", reg: REG.caissa }),

  // --- Arizona -------------------------------------------------------------
  C({ slug: "phoenix-scholastic-open-2026", name: "Phoenix Scholastic Open", org: "Arizona Chess Central", venue: "Phoenix Convention Center", addr: "100 N 3rd St", city: "Phoenix", state: "AZ", zip: "85004", start: "2026-09-27", fee: 2800, t: "scholasticFull", reg: REG.king }),
  C({ slug: "tucson-scholastic-open-2026", name: "Tucson Scholastic Open", org: "Southern Arizona Chess", venue: "Tucson Convention Center", addr: "260 S Church Ave", city: "Tucson", state: "AZ", zip: "85701", start: "2026-11-15", fee: 2500, t: "scholasticK8", reg: REG.caissa }),
  C({ slug: "mesa-cadet-open-2026", name: "Mesa Cadet (Under 16) Open", org: "East Valley Chess Club", venue: "Mesa Convention Center", addr: "263 N Center St", city: "Mesa", state: "AZ", zip: "85201", start: "2026-12-06", fee: 3000, t: "cadet", reg: REG.king }),

  // --- Missouri ------------------------------------------------------------
  C({ slug: "kansas-city-scholastic-2026", name: "Kansas City Scholastic", org: "KC Chess Academy", venue: "Kansas City Convention Center", addr: "301 W 13th St", city: "Kansas City", state: "MO", zip: "64106", start: "2026-09-13", fee: 2500, t: "scholasticK8", reg: REG.caissa }),
  C({ slug: "saint-louis-scholastic-open-2026", name: "Saint Louis Scholastic Open", org: "Gateway Chess League", venue: "Chase Park Plaza", addr: "212 N Kingshighway Blvd", city: "St. Louis", state: "MO", zip: "63108", start: "2026-10-18", fee: 3000, t: "scholasticFull", reg: REG.king }),
  C({ slug: "columbia-fall-scholastic-2026", name: "Columbia Fall Scholastic", org: "Mid-Missouri Chess Club", venue: "Hickman High School", addr: "1104 N Providence Rd", city: "Columbia", state: "MO", zip: "65201", start: "2026-11-01", fee: 2000, t: "scholasticK8", reg: REG.king }),

  // --- National invitationals (held alongside the U.S. Open) ---------------
  // Entry is by qualification, not fee — these are the events the pathway
  // engine points at. Dates/venue are illustrative seed data.
  C({ slug: "denker-tournament-2026", name: "Denker Tournament of High School Champions 2026", org: "US Chess", venue: "Westin Rancho Mirage (U.S. Open site)", addr: "71333 Dinah Shore Dr", city: "Rancho Mirage", state: "CA", zip: "92270", start: "2026-08-01", days: 4, fee: 0, t: "denker", series: 1, reg: REG.uschess }),
  C({ slug: "barber-tournament-2026", name: "Barber Tournament of K-8 Champions 2026", org: "US Chess", venue: "Westin Rancho Mirage (U.S. Open site)", addr: "71333 Dinah Shore Dr", city: "Rancho Mirage", state: "CA", zip: "92270", start: "2026-08-01", days: 4, fee: 0, t: "barber", series: 2, reg: REG.uschess }),
  C({ slug: "rockefeller-tournament-2026", name: "Rockefeller Tournament of K-5 Champions 2026", org: "US Chess", venue: "Westin Rancho Mirage (U.S. Open site)", addr: "71333 Dinah Shore Dr", city: "Rancho Mirage", state: "CA", zip: "92270", start: "2026-08-01", days: 4, fee: 0, t: "rockefeller", series: 3, reg: REG.uschess }),
  C({ slug: "haring-tournament-2026", name: "Haring Tournament of Girls State Champions 2026", org: "US Chess", venue: "Westin Rancho Mirage (U.S. Open site)", addr: "71333 Dinah Shore Dr", city: "Rancho Mirage", state: "CA", zip: "92270", start: "2026-08-01", days: 4, fee: 0, t: "haring", series: 4, reg: REG.uschess }),
  C({ slug: "us-junior-championship-2026", name: "U.S. Junior Championship 2026", org: "Saint Louis Chess Club", venue: "Saint Louis Chess Club", addr: "4657 Maryland Ave", city: "St. Louis", state: "MO", zip: "63108", start: "2026-10-07", days: 8, fee: 0, t: "usJunior", series: 5, reg: REG.uschess }),
];

// ---------------------------------------------------------------------------
// Qualification rules — THE MOAT, seeded as scaffolding.
//
// ⚠️ PLAUSIBLE SCAFFOLDING, NOT VERIFIED TRUTH. The Denker/Barber/
// Rockefeller/Haring pattern is real (each state's champion is invited to
// the national invitational at the U.S. Open), but the exact criteria change
// yearly and MUST be re-verified against current official US Chess
// announcements before launch. See SETUP.md step 6.
// ---------------------------------------------------------------------------
const VERIFIED_ON = "2026-07-01";
const STATE_SERIES = [
  { n: 6, state: "Texas" },
  { n: 7, state: "New York" },
  { n: 8, state: "California" },
  { n: 9, state: "Illinois" },
  { n: 10, state: "New Jersey" },
];
const NATIONALS = [
  { n: 1, section: "High School Championship", label: "Denker Tournament of High School Champions" },
  { n: 2, section: "K-8 Championship", label: "Barber Tournament of K-8 Champions" },
  { n: 3, section: "K-5 Championship", label: "Rockefeller Tournament of K-5 Champions" },
  { n: 4, section: "Girls Championship", label: "Haring Tournament of Girls State Champions" },
];

const rules = [];
let ruleN = 0;
for (const st of STATE_SERIES) {
  for (const nat of NATIONALS) {
    ruleN += 1;
    rules.push({
      id: ruleId(ruleN),
      from_series_id: seriesId(st.n),
      from_competition_id: null,
      required_placement: 1,
      to_series_id: seriesId(nat.n),
      notes: `Winner of the ${st.state} ${nat.section} section is invited to the ${nat.label}, held alongside the U.S. Open. SEED SCAFFOLDING — verify against the current US Chess invitational announcement before launch.`,
      verified_on: VERIFIED_ON,
    });
  }
}
// Placement-sensitive regional → state edges ("top 3 qualifies", so asking
// "what if I get 3rd?" visibly changes the answer).
ruleN += 1;
rules.push({
  id: ruleId(ruleN),
  from_series_id: seriesId(11),
  from_competition_id: null,
  required_placement: 3,
  to_series_id: seriesId(6),
  notes: "Top 3 finishers in each North Texas Scholastic Regional section earn a qualifier seed into the Texas Scholastic Championship. SEED SCAFFOLDING — illustrative regional qualifier rule; verify with the Texas Chess Association.",
  verified_on: VERIFIED_ON,
});
ruleN += 1;
rules.push({
  id: ruleId(ruleN),
  from_series_id: seriesId(12),
  from_competition_id: null,
  required_placement: 3,
  to_series_id: seriesId(9),
  notes: "Top 3 finishers in the Chicago Scholastic Championship Series earn a qualifier seed into the Illinois K-12 State Championship. SEED SCAFFOLDING — illustrative regional qualifier rule; verify with the Illinois Chess Association.",
  verified_on: VERIFIED_ON,
});
// Third hop: Denker champion → U.S. Junior invitation, so the depth-3 walk
// (regional → state → Denker → U.S. Junior) is visible on screen.
ruleN += 1;
rules.push({
  id: ruleId(ruleN),
  from_series_id: seriesId(1),
  from_competition_id: null,
  required_placement: 1,
  to_series_id: seriesId(5),
  notes: "Denker champion receives an invitation to the U.S. Junior Championship. SEED SCAFFOLDING — the real Denker prize is a scholarship; this edge exists to demonstrate a 3-hop chain and must be replaced with a verified rule.",
  verified_on: VERIFIED_ON,
});
// One rule keyed directly on a single competition (from_competition_id),
// exercising the non-series path through the engine.
ruleN += 1;
rules.push({
  id: ruleId(ruleN),
  from_series_id: null,
  from_competition_id: null, // patched below once competition ids exist
  required_placement: 3,
  to_series_id: seriesId(6),
  notes: "Top 3 in the Lone Star Open Scholastic Championship section earn a qualifier seed into the Texas Scholastic Championship. SEED SCAFFOLDING — example of a rule attached to a single event rather than a series.",
  verified_on: VERIFIED_ON,
});

// ---------------------------------------------------------------------------
// Assemble output rows.
// ---------------------------------------------------------------------------
const addDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const seriesRows = SERIES.map((s0) => ({ id: seriesId(s0.n), name: s0.name, level: s0.level }));

const competitionRows = [];
const sectionRows = [];
COMPETITIONS.forEach((c, i) => {
  const n = i + 1;
  const id = compId(n);
  const [lat, lng] = ZIPS[c.zip];
  const invitational = c.fee === 0;
  competitionRows.push({
    id,
    slug: c.slug,
    name: c.name,
    category: "chess",
    organizer_name: c.org,
    venue_name: c.venue,
    address: c.addr,
    city: c.city,
    state: c.state,
    zip: c.zip,
    lat,
    lng,
    start_date: c.start,
    end_date: c.days ? addDays(c.start, c.days - 1) : null,
    reg_deadline: invitational ? null : addDays(c.start, -5),
    reg_url: c.reg,
    entry_fee_cents: c.fee,
    rated: true,
    rating_system: "uschess",
    series_id: c.series ? seriesId(c.series) : null,
    source: "manual",
    source_url: null,
    status: "published",
  });

  const template = TEMPLATES[c.t](c.tArg);
  template.forEach((sec, j) => {
    sectionRows.push({
      id: sectionId(n, j + 1),
      competition_id: id,
      name: sec.name,
      min_rating: sec.min_rating ?? null,
      max_rating: sec.max_rating ?? null,
      min_grade: sec.min_grade ?? null,
      max_grade: sec.max_grade ?? null,
      min_age: sec.min_age ?? null,
      max_age: sec.max_age ?? null,
      gender_restriction: sec.gender_restriction ?? null,
      residency_state: sec.residency_state ?? null,
      // State-championship HS sections cost $10 over the event fee — a
      // realistic per-section override that exercises the fee-override path.
      entry_fee_cents: sec.fee ? c.fee + sec.fee : null,
    });
  });
});

// Patch the competition-keyed rule now that competition ids exist.
const loneStar = competitionRows.find((c) => c.slug === "lone-star-open-scholastic-2026");
rules[rules.length - 1].from_competition_id = loneStar.id;

const zipRows = Object.entries(ZIPS).map(([zip, [lat, lng]]) => ({
  zip: String(zip).padStart(5, "0"),
  lat,
  lng,
}));

// ---------------------------------------------------------------------------
// Write files.
// ---------------------------------------------------------------------------
const write = (rel, rows) => {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
  console.log(`wrote ${rel} (${rows.length} rows)`);
};

write("data/seed/series.json", seriesRows);
write("data/seed/competitions.json", competitionRows);
write("data/seed/sections.json", sectionRows);
write("data/seed/qualification_rules.json", rules);
write("data/zips.sample.json", zipRows);
