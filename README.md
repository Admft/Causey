# Causey — competition discovery and district coordination

Causey is an early-build product for discovering scholastic competitions and
coordinating school and club participation. Chess is the broadest usable
discovery surface, and its coverage is still incomplete. Speech and debate,
STEM, arts, and writing directories use only a few official sources and may
return few or no listings. Schools, districts, clubs, and teams can also host
these competition types or a custom type inside their organization workspaces.

The app supports student, parent, and coach accounts; organization memberships
for staff, school administrators, and district administrators; and a separate
platform moderation shell. District use is currently an assisted pilot, not a
self-serve district product.

## Run it

```
npm install
npm run dev
```

With an empty `.env`, the public discovery surface boots on labeled
illustrative mock data. Account, organization, district, and platform-admin
workflows require Supabase and `DATA_SOURCE=supabase`; follow [`SETUP.md`](SETUP.md)
and [`docs/district-pilot-runbook.md`](docs/district-pilot-runbook.md).

`npm test` runs the automated suite.

## Current product boundaries

- **No in-app registration or payments** — event pages link out to the
  organizer's own registration site.
- **Incomplete coverage** — indexed listings and qualification pathways must be
  confirmed with the organizer or governing body.
- **Assisted district provisioning** — platform staff create and verify
  districts; Resend product email sends staff claims and preserves copyable
  fallback links for district operations.
- **Student information is stored for account workflows** — including date of
  birth, derived age band, organization membership, RSVPs, and attendance.
  Public disclosures live at `/privacy` and `/terms`; district pilots still
  require owner/legal review and an approved agreement.
- **Chess-first coverage** — speech and debate, STEM, arts, and writing now
  have public search pages, but each relies on a very small set of official
  sources and may return few or no listings. Custom organization competition
  types remain private coordination records rather than public directories.

## Architecture

```
app/                    Next.js App Router pages + API routes
  page.tsx              discovery-first home
  chess/                 zip/radius tournament search
  event/[slug]/         event detail: sections, eligibility badges,
                        organizer registration link, account actions
  pathways/             pathway explorer (event + placement → what it opens)
  me/ family/ orgs/      student, parent, and organization workspaces
  admin/                 platform moderation and provisioning
  api/                  competitions, competitions/[slug], pathways
components/             CompetitionCard, SearchFilters, EligibilityBadges,
                        role workspaces, account and admin controls
lib/
  data/                 mock public discovery + Supabase implementations
  actions/              authenticated account and organization operations
  auth/                 personal roles, org membership access, platform admin
  qualification.ts      pure recursive pathway walk (unit-tested)
  geo.ts                haversine distance
  schemas.ts            Zod schemas — DB rows, seed JSON, and API all share them
  ratings.ts            USCF/MSA lookup — interface stub for future verified mode
data/seed/              generated seed JSON (see scripts/generate-seed.mjs)
ingestion/              source-specific scrapers → drafts → human review
supabase/migrations/    accounts, organizations, governance, listings, alerts
tests/                  Vitest suites
```

Public discovery imports `getDataSource()` rather than a concrete backend.
`DATA_SOURCE=mock` reads labeled seed JSON in-process;
`DATA_SOURCE=supabase` uses the configured database. Authenticated portal
features use Supabase directly and do not run as a fake local substitute.

**Seed data is labeled, not laundered.** Events are realistic but
illustrative, and the seeded qualification rules are scaffolding pending
verification against official US Chess announcements — flagged in the UI
footer, the seed generator, and `SETUP.md` step 6.

## Design

Tokens, type scale, radii, shadows, and component patterns come from
`CAUSEY-DESIGN-SYSTEM.txt` (the marketing-site source of truth), under the
constraints in `anti-vibecode-rules.txt`. Brand red `#c23b32` is the only
primary accent; the coordinate-grid motif marks the search band — access
shouldn't depend on where you live.
