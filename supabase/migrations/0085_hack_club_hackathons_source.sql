-- Official public Hack Club Hackathons JSON directory (virtual + US listings).

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
    'congressional_app_challenge_scrape',
    'hack_club_hackathons_scrape'
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
    'congressional_app_challenge_scrape',
    'hack_club_hackathons_scrape'
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
    'hack_club_hackathons_scrape',
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
  'hack_club_hackathons_scrape',
  'Hack Club Hackathons',
  'https://hackathons.hackclub.com/',
  '/sources/state-affiliates.svg',
  'Documented high-school hackathon JSON directory. Causey indexes virtual events and US in-person rows, with credit to Hack Club Hackathons. Logos are not stored.',
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
