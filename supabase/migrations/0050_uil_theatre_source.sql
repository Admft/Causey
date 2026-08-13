-- Official public UIL theatre state-meet dates.

alter table public.competitions
  drop constraint if exists competitions_source_check;
alter table public.competitions
  add constraint competitions_source_check
  check (source in (
    'manual',
    'tla_scrape',
    'cca_scrape',
    'organizer',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape',
    'tca_scrape',
    'tabroom_scrape',
    'vex_events_scrape',
    'taea_vase_scrape',
    'bennington_writers_scrape',
    'doe_science_bowl_scrape',
    'afsa_essay_scrape',
    'uil_theatre_scrape'
  ));

alter table public.competition_sources
  drop constraint if exists competition_sources_source_check;
alter table public.competition_sources
  add constraint competition_sources_source_check
  check (source in (
    'manual',
    'tla_scrape',
    'cca_scrape',
    'organizer',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape',
    'tca_scrape',
    'tabroom_scrape',
    'vex_events_scrape',
    'taea_vase_scrape',
    'bennington_writers_scrape',
    'doe_science_bowl_scrape',
    'afsa_essay_scrape',
    'uil_theatre_scrape'
  ));

alter table public.scrape_runs
  drop constraint if exists scrape_runs_source_check;
alter table public.scrape_runs
  add constraint scrape_runs_source_check
  check (source in (
    'tla_scrape',
    'cca_scrape',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape',
    'tca_scrape',
    'tabroom_scrape',
    'vex_events_scrape',
    'taea_vase_scrape',
    'bennington_writers_scrape',
    'doe_science_bowl_scrape',
    'afsa_essay_scrape',
    'uil_theatre_scrape',
    'all'
  ));

insert into public.ingestion_sources (
  id,
  name,
  home_url,
  logo_url,
  blurb,
  status,
  category
)
values (
  'uil_theatre_scrape',
  'UIL Theatre State Meets',
  'https://www.uiltexas.org/theatre/state',
  '/sources/state-affiliates.svg',
  'Official UIL high-school theatre state-meet dates. Coverage excludes regional, district, zone, and local events.',
  'live',
  'arts'
)
on conflict (id) do update set
  name = excluded.name,
  home_url = excluded.home_url,
  logo_url = excluded.logo_url,
  blurb = excluded.blurb,
  status = excluded.status,
  category = excluded.category;
