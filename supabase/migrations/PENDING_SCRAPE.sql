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
-- Optional cover image scraped from the event / organizer page.
-- Null is normal — many listings have no usable photo. The UI must not
-- reserve empty image chrome when this is null.
alter table competitions
  add column if not exists image_url text;

comment on column competitions.image_url is
  'Best-effort cover image from the upstream/organizer page. Null when none found.';
-- Pathway enrichment + per-ingestion-source branding.
-- Pathways default to "none". AI (Claude Haiku via AI Gateway) may set
-- uncertain / known with a short summary — never auto-writes qualification_rules.

create table if not exists public.ingestion_sources (
  id text primary key, -- tla_scrape | cca_scrape | …
  name text not null,
  home_url text not null,
  logo_url text, -- site-relative (/sources/…) or absolute
  blurb text,
  status text not null default 'live'
    check (status in ('live', 'soon')),
  created_at timestamptz not null default now()
);

insert into public.ingestion_sources (id, name, home_url, logo_url, blurb, status)
values
  (
    'tla_scrape',
    'US Chess (TLA)',
    'https://new.uschess.org/upcoming-tournaments',
    '/sources/uschess.svg',
    'Official USCF-rated tournament directory.',
    'live'
  ),
  (
    'cca_scrape',
    'Continental Chess (CCA)',
    'https://www.chesstour.com/refs.html',
    '/sources/cca.svg',
    'Major US opens — World Open, National Chess Congress, and more.',
    'live'
  ),
  (
    'onlinereg',
    'OnlineRegistration.cc',
    'https://onlineregistration.cc',
    '/sources/onlinereg.svg',
    'Organizer registration hub used by many US events.',
    'soon'
  ),
  (
    'chess_results',
    'Chess-Results.com',
    'https://chess-results.com',
    '/sources/chess-results.svg',
    'Global pairings and results (Swiss-Manager publishes here).',
    'soon'
  ),
  (
    'fide_calendar',
    'FIDE Calendar',
    'https://fide.com/calendar',
    '/sources/fide.svg',
    'Official international events — World Cup, Candidates, Grand Swiss.',
    'soon'
  ),
  (
    'state_affiliates',
    'USCF state affiliates',
    '/sources/state-affiliates',
    '/sources/state-affiliates.svg',
    'All 50 states + DC — scholastic qualifiers and state championships.',
    'soon'
  )
on conflict (id) do update set
  name = excluded.name,
  home_url = excluded.home_url,
  logo_url = excluded.logo_url,
  blurb = excluded.blurb,
  status = excluded.status;

alter table public.competitions
  add column if not exists pathway_status text not null default 'none'
    check (pathway_status in ('none', 'uncertain', 'known')),
  add column if not exists pathway_summary text,
  add column if not exists pathway_related jsonb not null default '[]'::jsonb,
  add column if not exists pathway_input_hash text,
  add column if not exists pathway_model text,
  add column if not exists pathway_enriched_at timestamptz;

comment on column public.competitions.pathway_status is
  'none = assume no qualifier path; uncertain = check organizer site; known = linked series / described path';
comment on column public.competitions.pathway_summary is
  'Short human-readable pathway note for the event page';
comment on column public.competitions.pathway_related is
  'JSON array of {name, note?} related tournaments / series labels';

create table if not exists public.enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('pathway', 'image', 'sections')),
  source text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'skipped')),
  rows_considered int not null default 0,
  rows_updated int not null default 0,
  rows_skipped_cache int not null default 0,
  model text,
  prompt_version text,
  tokens_in int,
  tokens_out int,
  error text,
  meta jsonb not null default '{}'::jsonb
);

alter table public.ingestion_sources enable row level security;
alter table public.enrichment_runs enable row level security;

drop policy if exists "ingestion_sources_public_read" on public.ingestion_sources;
create policy "ingestion_sources_public_read"
  on public.ingestion_sources for select
  using (true);

-- enrichment_runs: service role only (no public policy)
-- Allow unknown entry fees (scrapers often lack structured EF data).
-- null = fee not listed; 0 = explicitly free / no charge.

alter table public.competitions
  alter column entry_fee_cents drop not null;

alter table public.competitions
  alter column entry_fee_cents set default null;

comment on column public.competitions.entry_fee_cents is
  'Entry fee in cents. null = not listed on the source page; 0 = free.';
