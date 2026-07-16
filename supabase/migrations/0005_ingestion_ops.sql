-- Ingestion ops: provenance sources, fingerprint dedupe, scrape run logs.
-- Run in Supabase SQL editor after 0001–0004.

-- Normalized identity string used to detect the same physical event across
-- scrapers (e.g. World Open on US Chess + CCA). Format is set in
-- ingestion/fingerprint.ts — do not hand-edit.
alter table competitions
  add column if not exists fingerprint text;

-- When set, this row is a secondary copy of another competition. Search only
-- shows rows where canonical_id is null and status = 'published'.
alter table competitions
  add column if not exists canonical_id uuid references competitions (id);

create index if not exists competitions_fingerprint_idx
  on competitions (fingerprint)
  where fingerprint is not null;

create index if not exists competitions_canonical_idx
  on competitions (canonical_id)
  where canonical_id is not null;

-- Every upstream sighting of an event. One competition can have many sources
-- (TLA + CCA). UNIQUE(source, external_key) is the scrape identity key.
create table if not exists competition_sources (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  source text not null
    check (source in ('manual', 'tla_scrape', 'cca_scrape', 'organizer')),
  external_key text not null,
  source_url text,
  last_seen_at timestamptz not null default now(),
  unique (source, external_key)
);

create index if not exists competition_sources_competition_idx
  on competition_sources (competition_id);

-- Ops log for each scraper invocation (cron, local, Docker).
create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('tla_scrape', 'cca_scrape', 'all')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  rows_staged int,
  rows_upserted int,
  duplicates_linked int default 0,
  series_attached int default 0,
  error text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists scrape_runs_started_idx on scrape_runs (started_at desc);

alter table competition_sources enable row level security;
alter table scrape_runs enable row level security;

-- Provenance is public-readable (helps "where did this listing come from?").
-- Writes stay service-role only (no insert/update policies for anon).
drop policy if exists "competition sources are public" on competition_sources;
create policy "competition sources are public" on competition_sources
  for select using (true);

-- scrape_runs: no public policies — service role only.
