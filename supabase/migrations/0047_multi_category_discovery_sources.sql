-- Official public ingest sources for the first non-chess discovery slice.

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
    'bennington_writers_scrape'
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
    'bennington_writers_scrape'
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
    'all'
  ));

alter table public.ingestion_sources
  add column if not exists category text not null default 'chess';
alter table public.ingestion_sources
  drop constraint if exists ingestion_sources_category_check;
alter table public.ingestion_sources
  add constraint ingestion_sources_category_check
  check (category in ('chess', 'stem', 'debate', 'arts', 'writing'));

insert into public.ingestion_sources (
  id,
  name,
  home_url,
  logo_url,
  blurb,
  status,
  category
)
values
  (
    'tabroom_scrape',
    'Tabroom',
    'https://www.tabroom.com/index/index.mhtml',
    '/sources/state-affiliates.svg',
    'Official public speech and debate tournament calendars. Coverage is limited to configured public calendars.',
    'live',
    'debate'
  ),
  (
    'vex_events_scrape',
    'VEX Events',
    'https://events.vex.com/robot-competitions/vex-robotics-competition',
    '/sources/state-affiliates.svg',
    'Official public VEX robotics event directory. Automated refresh was blocked by a normal HTTP 403 response on 2026-08-12.',
    'soon',
    'stem'
  ),
  (
    'taea_vase_scrape',
    'TAEA VASE',
    'https://www.taea.org/vase/directors-dates.asp',
    '/sources/state-affiliates.svg',
    'Official public Visual Arts Scholastic Event dates.',
    'live',
    'arts'
  ),
  (
    'bennington_writers_scrape',
    'Bennington Young Writers Awards',
    'https://www.bennington.edu/events/young-writers-awards',
    '/sources/state-affiliates.svg',
    'Official public high-school writing award page. Listings require a year-specific cycle.',
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

update public.ingestion_sources
set category = 'chess'
where id not in (
  'tabroom_scrape',
  'vex_events_scrape',
  'taea_vase_scrape',
  'bennington_writers_scrape'
);

comment on column public.ingestion_sources.category is
  'Public discovery category supplied by this ingestion source.';
