-- Allow hub scrapers: OnlineRegistration, Chess-Results, FIDE Calendar.
-- Also widen scrape_runs.source for ops logs.

alter table public.competitions drop constraint if exists competitions_source_check;
alter table public.competitions
  add constraint competitions_source_check
  check (source in (
    'manual',
    'tla_scrape',
    'cca_scrape',
    'organizer',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape'
  ));

comment on column public.competitions.source is
  'Ingestion pipeline id: manual | tla_scrape | cca_scrape | organizer | onlinereg_scrape | chess_results_scrape | fide_calendar_scrape';

alter table public.competition_sources drop constraint if exists competition_sources_source_check;
alter table public.competition_sources
  add constraint competition_sources_source_check
  check (source in (
    'manual',
    'tla_scrape',
    'cca_scrape',
    'organizer',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape'
  ));

alter table public.scrape_runs drop constraint if exists scrape_runs_source_check;
alter table public.scrape_runs
  add constraint scrape_runs_source_check
  check (source in (
    'tla_scrape',
    'cca_scrape',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape',
    'all'
  ));

insert into public.ingestion_sources (id, name, home_url, logo_url, blurb, status)
values
  (
    'onlinereg_scrape',
    'OnlineRegistration.cc',
    'https://onlineregistration.cc/tournaments/index.php',
    '/sources/onlinereg.svg',
    'Organizer registration hub used by many US events.',
    'live'
  ),
  (
    'chess_results_scrape',
    'Chess-Results.com',
    'https://chess-results.com',
    '/sources/chess-results.svg',
    'Global pairings and results (Swiss-Manager). Causey indexes USA upcoming OTB events.',
    'live'
  ),
  (
    'fide_calendar_scrape',
    'FIDE Calendar',
    'https://calendar.fide.com/calendar.php',
    '/sources/fide.svg',
    'Official international calendar — World events, Circuit, Continental stages.',
    'live'
  )
on conflict (id) do update set
  name = excluded.name,
  home_url = excluded.home_url,
  logo_url = excluded.logo_url,
  blurb = excluded.blurb,
  status = excluded.status;

-- Flip the original soon-branded hub rows to live and fix the FIDE URL.
update public.ingestion_sources
set
  status = 'live',
  home_url = case id
    when 'fide_calendar' then 'https://calendar.fide.com/calendar.php'
    when 'onlinereg' then 'https://onlineregistration.cc/tournaments/index.php'
    else home_url
  end,
  blurb = case id
    when 'chess_results' then 'Global pairings and results (Swiss-Manager). Causey indexes USA upcoming OTB events.'
    when 'fide_calendar' then 'Official international calendar — World events, Circuit, Continental stages.'
    else blurb
  end
where id in ('onlinereg', 'chess_results', 'fide_calendar');
