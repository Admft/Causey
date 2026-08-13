-- Official public AFSA National High School Essay Contest cycles.

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
    'afsa_essay_scrape'
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
    'afsa_essay_scrape'
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
  'afsa_essay_scrape',
  'AFSA National High School Essay Contest',
  'https://afsa.org/essay-contest',
  '/sources/state-affiliates.svg',
  'Official AFSA essay-contest cycles. Causey publishes only cycles with an exact official year, deadline, eligibility, and open or closed status.',
  'live',
  'writing'
)
on conflict (id) do update set
  name = excluded.name,
  home_url = excluded.home_url,
  logo_url = excluded.logo_url,
  blurb = excluded.blurb,
  status = excluded.status,
  category = excluded.category;
