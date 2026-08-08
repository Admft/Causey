# AGENTS.md

Causey — a single Next.js (App Router) web app for US scholastic chess
tournament discovery. One product, one service. See `README.md` and `SETUP.md`
for the full picture and `.cursor/rules/causey-core.mdc` for product/copy rules.

## Cursor Cloud specific instructions

### Services & commands

There is exactly one service: the Next.js app. It runs fully on in-repo mock
data with an **empty `.env`** — no database, network, or other services are
required for local development or the test suite.

- Run (dev): `npm run dev` → http://localhost:3000 (see `package.json` scripts)
- Test: `npm test` (Vitest)
- Type-check (there is **no ESLint / lint script**; strict `tsc` is the linter):
  `npx tsc --noEmit`
- Build: `npm run build`

Supabase and OpenAI are **optional** and only needed for `DATA_SOURCE=supabase`,
the account/auth pages (`/signup`, `/orgs`, `/family`), and the `ingestion/`
scrapers — not for running or testing the core search/pathways product.

### Non-obvious gotchas

- **Node / ICU:** the VM's default `node` (`/exec-daemon/node`) is a
  limited-ICU build that mis-decodes legacy charsets (e.g. `windows-1252` →
  latin1), which breaks the CCA scraper's decode and fails
  `tests/parse-cca.test.ts`. A full-ICU Node 22 (matching CI) is installed via
  `nvm` and auto-selected by a `PATH` prepend in `~/.bashrc`, so a fresh
  interactive shell already runs the correct `node` — verify with
  `node -e 'console.log(new TextDecoder("windows-1252").decode(Buffer.from([0x95])))'`
  (should print `•`, not a control char). If a fresh VM ever lacks it, run
  `nvm install 22` (the `~/.bashrc` prepend then picks it up automatically).
  All 100 tests pass on the full-ICU node.

- **Mock seed data must be generated.** The committed
  `data/seed/competitions.json` and `data/seed/sections.json` are empty `[]`;
  `npm run seed:generate` (in the startup update script) regenerates the full
  seed (46 competitions, 187 sections) plus `data/zips.sample.json`. It is
  deterministic and idempotent, so after setup `git status` will show
  `data/seed/*` and `data/zips.sample.json` as modified — that is expected;
  do **not** commit those regenerated files unless you intend a seed change.

- **Mock-mode search quirks:** only the sample zips resolve (`75201`, `10001`,
  `90012`, `60602`); any other zip returns a 422 `zip_not_found`. The search API
  radius param is `radius_miles` (not `radius`), and `timing` defaults to
  `upcoming` (past-dated events are hidden). Seed events are dated 2026–2027.
