-- Allow Continental Chess Association scraper provenance.
-- Postgres CHECK constraints can't be altered in place — drop and recreate.
alter table competitions drop constraint if exists competitions_source_check;
alter table competitions
  add constraint competitions_source_check
  check (source in ('manual', 'tla_scrape', 'cca_scrape', 'organizer'));

comment on column competitions.source is
  'Ingestion pipeline id: manual | tla_scrape | cca_scrape | organizer';
