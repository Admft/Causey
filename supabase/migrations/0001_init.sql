-- Causey chess MVP schema.
--
-- Radius search: cube + earthdistance (chosen over PostGIS — we only ever
-- need point-to-point distance on a few thousand rows, and earthdistance is
-- lighter to run and enabled by default on Supabase; swap for PostGIS later
-- if we need polygons/geofencing).
create extension if not exists cube;
create extension if not exists earthdistance;
create extension if not exists "pgcrypto"; -- gen_random_uuid

-- Recurring-event identity. Qualification rules key on series, not on a
-- year's instance, so the graph survives year over year.
create table series (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null check (level in ('local', 'state', 'national', 'international'))
);

create table competitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'chess',
  organizer_name text,
  venue_name text,
  address text,
  city text not null,
  state text not null,
  zip text not null,
  lat double precision not null,
  lng double precision not null,
  start_date date not null,
  end_date date,
  reg_deadline date,
  reg_url text not null,
  entry_fee_cents int not null default 0,       -- affordability filter is a real feature
  rated boolean not null default true,
  rating_system text not null default 'uschess',
  series_id uuid references series (id),
  source text not null default 'manual'
    check (source in ('manual', 'tla_scrape', 'organizer')),
  -- Ingestion staging: scraped rows land as 'draft'; a human reviews in the
  -- Supabase table editor and flips to 'published'. The app only reads
  -- 'published'.
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competitions_state_start_date_idx on competitions (state, start_date);
create index competitions_lat_lng_idx on competitions using gist (ll_to_earth(lat, lng));
create index competitions_status_idx on competitions (status);
create index competitions_series_idx on competitions (series_id);

-- Eligibility lives per section, not per event.
create table sections (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions (id) on delete cascade,
  name text not null,
  min_rating int,
  max_rating int,
  min_grade int check (min_grade between 0 and 12),  -- 0 = Kindergarten
  max_grade int check (max_grade between 0 and 12),
  min_age int,
  max_age int,
  gender_restriction text check (gender_restriction in ('girls')),
  residency_state text,
  entry_fee_cents int                                -- overrides event fee if set
);

create index sections_competition_idx on sections (competition_id);

-- THE MOAT. Curated by hand; every rule carries its citation and the date it
-- was last verified (criteria change yearly).
create table qualification_rules (
  id uuid primary key default gen_random_uuid(),
  from_series_id uuid references series (id),
  from_competition_id uuid references competitions (id),
  required_placement int not null check (required_placement >= 1), -- 1 = must win, 3 = top 3
  to_series_id uuid not null references series (id),
  notes text not null,
  verified_on date not null,
  check (num_nonnulls(from_series_id, from_competition_id) = 1)
);

create index qualification_rules_from_series_idx on qualification_rules (from_series_id);
create index qualification_rules_from_competition_idx on qualification_rules (from_competition_id);

-- Zip centroid lookup for radius search. Load the full ~42k-row US dataset
-- (see SETUP.md step 2); data/zips.sample.json covers only seeded cities.
create table zips (
  zip text primary key,
  lat double precision not null,
  lng double precision not null
);

-- ---------------------------------------------------------------------------
-- Row-level security: the app uses the anon key read-only. Published rows are
-- public; drafts are visible only to the service role (seeding/ingestion).
-- No user tables exist by design (no accounts, no student PII — COPPA).
-- ---------------------------------------------------------------------------
alter table series enable row level security;
alter table competitions enable row level security;
alter table sections enable row level security;
alter table qualification_rules enable row level security;
alter table zips enable row level security;

create policy "series are public" on series for select using (true);
create policy "published competitions are public" on competitions
  for select using (status = 'published');
create policy "sections of published competitions are public" on sections
  for select using (
    exists (
      select 1 from competitions c
      where c.id = sections.competition_id and c.status = 'published'
    )
  );
create policy "qualification rules are public" on qualification_rules for select using (true);
create policy "zips are public" on zips for select using (true);

-- updated_at maintenance
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger competitions_updated_at
  before update on competitions
  for each row execute function set_updated_at();
