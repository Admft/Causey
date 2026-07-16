-- Provenance for ingested competitions: which page a scraper pulled from.
-- `source` identifies the scraper/pipeline (e.g. tla_scrape);
-- `source_url` is the exact upstream event page (e.g. a US Chess TLA URL).
alter table competitions
  add column if not exists source_url text;

comment on column competitions.source is
  'Ingestion pipeline id: manual | tla_scrape | organizer (extend as scrapers are added).';
comment on column competitions.source_url is
  'Canonical upstream page the scraper read (null for hand-entered rows).';
