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
