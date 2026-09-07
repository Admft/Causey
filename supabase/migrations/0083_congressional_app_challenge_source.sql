-- Official public Congressional App Challenge national submission window.

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
    'uil_theatre_scrape',
    'uil_speech_debate_scrape',
    'purple_comet_scrape',
    'uil_music_marching_scrape',
    'txsef_scrape',
    'congressional_app_challenge_scrape'
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
    'uil_theatre_scrape',
    'uil_speech_debate_scrape',
    'purple_comet_scrape',
    'uil_music_marching_scrape',
    'txsef_scrape',
    'congressional_app_challenge_scrape'
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
    'uil_speech_debate_scrape',
    'purple_comet_scrape',
    'uil_music_marching_scrape',
    'txsef_scrape',
    'congressional_app_challenge_scrape',
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
  'congressional_app_challenge_scrape',
  'Congressional App Challenge',
  'https://www.congressionalappchallenge.us/students/participating-districts/',
  '/sources/state-affiliates.svg',
  'Official national student app-submission window. Causey indexes one year-specific cycle, not a row per congressional district.',
  'live',
  'stem'
)
on conflict (id) do update set
  name = excluded.name,
  home_url = excluded.home_url,
  logo_url = excluded.logo_url,
  blurb = excluded.blurb,
  status = excluded.status,
  category = excluded.category;
