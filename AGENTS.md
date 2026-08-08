# AGENTS.md

## Cursor Cloud specific instructions

Causey is a Next.js (App Router, React 19, Tailwind v4) student chess-tournament
discovery app. For general setup, run commands, and data-mode details, see
`README.md` and `SETUP.md`. Notes below are the non-obvious bits.

### Services

- Single service: the Next.js app. `npm run dev` serves it on `http://localhost:3000`.
- Runs fully on seeded mock data by default (`DATA_SOURCE=mock`) with an empty
  `.env` — no external services, no network calls. Supabase/OpenAI/scrapers are
  all optional and only needed for real-data mode or ingestion (see `SETUP.md`).

### Mock seed data must be generated (key gotcha)

- The committed seed files `data/seed/competitions.json` and
  `data/seed/sections.json` are intentionally empty (`[]`) in git. Until you run
  `npm run seed:generate`, mock-mode search returns **0 results** even though the
  app boots and pages return HTTP 200.
- `npm run seed:generate` is deterministic, offline, and idempotent; it writes
  ~42-46 competitions and ~187 sections. It is part of the startup update script.
  Do NOT commit the regenerated seed JSON — the repo keeps those files empty.

### Search / API notes

- Mock-mode search only works for the sample zips in `data/zips.sample.json`:
  `75201` (Dallas), `10001` (NYC), `90012` (LA), `60602` (Chicago). Other zips
  return HTTP 422 `zip_not_found` by design.
- The competitions search API query param is `radius_miles` (not `radius`), e.g.
  `/api/competitions?zip=75201&radius_miles=100`.

### Lint / test / build

- Tests: `npm test` (vitest, ~180 tests). No `lint` script is defined in
  `package.json`; there is no configured ESLint step to run.
